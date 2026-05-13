package expo.modules.nativealarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat

/**
 * Foreground service that owns the ringtone playback + the ongoing alarm notification.
 *
 * AlarmReceiver starts this when an alarm fires. The service:
 *   - Plays the configured ringtone via MediaPlayer (alarm stream, looping).
 *   - Vibrates if requested.
 *   - Shows an ongoing notification with a full-screen intent → RingingActivity,
 *     plus Dismiss/Snooze actions.
 *   - Outlives the BroadcastReceiver and the Activity, so audio keeps playing
 *     even if the system can't launch the Activity from the background.
 *
 * Dismiss / Snooze are routed back through this service via ACTION_DISMISS /
 * ACTION_SNOOZE so there's one source of truth for stopping playback.
 */
class RingingService : Service() {

  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var currentInstanceId: String? = null
  private var currentGroupId: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_DISMISS -> {
        val id = currentInstanceId
        val group = currentGroupId.orEmpty()
        if (id != null) {
          Scheduler.onDismiss(this, id)
          NativeAlarmEventBus.emitDismissed(id, group)
        }
        stopAndExit()
        return START_NOT_STICKY
      }
      ACTION_SNOOZE -> {
        val id = currentInstanceId
        val group = currentGroupId.orEmpty()
        if (id != null) {
          Scheduler.snooze(this, id)
          val next = AlarmRegistry.get(this, id)
          NativeAlarmEventBus.emitSnoozed(id, group, next?.triggerAtMs ?: 0L)
        }
        stopAndExit()
        return START_NOT_STICKY
      }
    }

    val instanceId = intent?.getStringExtra(EXTRA_INSTANCE_ID)
      ?: return START_NOT_STICKY.also { stopSelf() }
    val alarm = AlarmRegistry.get(this, instanceId)
      ?: return START_NOT_STICKY.also { stopSelf() }

    // If a previous alarm is still ringing, replace it cleanly.
    if (currentInstanceId != null && currentInstanceId != instanceId) {
      stopMedia()
    }
    currentInstanceId = instanceId
    currentGroupId = alarm.groupId

    ensureChannel()
    val notification = buildNotification(alarm)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        FOREGROUND_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(FOREGROUND_ID, notification)
    }
    startRinging(alarm)

    // Best-effort attempt to surface the activity. The foreground status grants
    // the app the ability to start an Activity from the background.
    runCatching {
      startActivity(
        Intent(this, RingingActivity::class.java).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
          putExtra(RingingActivity.EXTRA_INSTANCE_ID, instanceId)
        },
      )
    }

    NativeAlarmEventBus.emitFired(instanceId, alarm.groupId)
    return START_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    stopMedia()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Alarms",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Range alarm notifications"
      setBypassDnd(true)
      enableVibration(false) // we control vibration manually
      setSound(null, null)   // sound is owned by MediaPlayer
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    nm.createNotificationChannel(channel)
  }

  private fun buildNotification(alarm: ScheduledAlarm): Notification {
    val openActivity = PendingIntent.getActivity(
      this,
      Scheduler.requestCode("svc:open:" + alarm.instanceId),
      Intent(this, RingingActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        putExtra(RingingActivity.EXTRA_INSTANCE_ID, alarm.instanceId)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val challenge = alarm.dismissChallenge != "none"
    val dismissGated = challenge
    val snoozeGated = challenge && alarm.challengeBlocksSnooze

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(alarm.label.ifBlank { "Alarm" })
      .setContentText(if (dismissGated || snoozeGated) "Tap to open and complete the challenge" else "Tap to open")
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(openActivity)
      .setFullScreenIntent(openActivity, true)

    if (!snoozeGated) {
      val snoozePI = PendingIntent.getService(
        this,
        Scheduler.requestCode("svc:snooze:" + alarm.instanceId),
        Intent(this, RingingService::class.java).setAction(ACTION_SNOOZE),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      builder.addAction(android.R.drawable.ic_lock_idle_alarm, "Snooze", snoozePI)
    }
    if (!dismissGated) {
      val dismissPI = PendingIntent.getService(
        this,
        Scheduler.requestCode("svc:dismiss:" + alarm.instanceId),
        Intent(this, RingingService::class.java).setAction(ACTION_DISMISS),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPI)
    }
    return builder.build()
  }

  private fun startRinging(alarm: ScheduledAlarm) {
    val uri = resolveUri(alarm.ringtoneUri)
    runCatching {
      mediaPlayer = MediaPlayer().apply {
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build(),
        )
        setDataSource(this@RingingService, uri)
        isLooping = true
        prepare()
        start()
      }
    }.onFailure {
      runCatching {
        mediaPlayer = MediaPlayer.create(
          this,
          RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
        ).apply {
          isLooping = true
          start()
        }
      }
    }
    if (alarm.vibrate) startVibrate()
  }

  private fun resolveUri(raw: String): Uri {
    if (raw.isBlank()) return RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
    return runCatching { Uri.parse(raw) }.getOrNull()
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
  }

  private fun startVibrate() {
    val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION") getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }
    vibrator = v
    val pattern = longArrayOf(0, 600, 400, 600, 400)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      v.vibrate(VibrationEffect.createWaveform(pattern, 0))
    } else {
      @Suppress("DEPRECATION") v.vibrate(pattern, 0)
    }
  }

  private fun stopMedia() {
    runCatching { mediaPlayer?.stop(); mediaPlayer?.release() }
    mediaPlayer = null
    runCatching { vibrator?.cancel() }
    vibrator = null
  }

  private fun stopAndExit() {
    stopMedia()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION") stopForeground(true)
    }
    currentInstanceId = null
    currentGroupId = null
    stopSelf()
  }

  companion object {
    const val EXTRA_INSTANCE_ID = "instanceId"
    const val ACTION_DISMISS = "expo.modules.nativealarm.RING_DISMISS"
    const val ACTION_SNOOZE = "expo.modules.nativealarm.RING_SNOOZE"
    const val CHANNEL_ID = "native_alarm_ringing"
    const val FOREGROUND_ID = 0xA1A2
  }
}
