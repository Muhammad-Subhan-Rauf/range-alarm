package expo.modules.nativealarm

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeAlarmModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("NativeAlarm")

    Events("onAlarmFired", "onAlarmDismissed", "onAlarmSnoozed")

    OnCreate {
      NativeAlarmEventBus.setListener(object : NativeAlarmEventBus.Listener {
        override fun onEvent(name: String, body: Bundle) {
          val map = mutableMapOf<String, Any?>()
          for (k in body.keySet()) map[k] = body.get(k)
          this@NativeAlarmModule.sendEvent(name, map)
        }
      })
    }

    OnDestroy {
      NativeAlarmEventBus.setListener(null)
    }

    AsyncFunction("scheduleAlarm") { payload: Map<String, Any?> ->
      Scheduler.schedule(ctx(), payload.toScheduledAlarm())
    }

    AsyncFunction("scheduleMany") { entries: List<Map<String, Any?>> ->
      val ctx = ctx()
      entries.forEach { Scheduler.schedule(ctx, it.toScheduledAlarm()) }
    }

    AsyncFunction("cancelAlarm") { instanceId: String ->
      Scheduler.cancel(ctx(), instanceId)
    }

    AsyncFunction("cancelGroup") { groupId: String ->
      Scheduler.cancelGroup(ctx(), groupId)
    }

    AsyncFunction("cancelAll") {
      Scheduler.cancelAll(ctx())
    }

    AsyncFunction("getScheduled") {
      AlarmRegistry.all(ctx()).map {
        mapOf(
          "instanceId" to it.instanceId,
          "groupId" to it.groupId,
          "triggerAtMs" to it.triggerAtMs,
        )
      }
    }

    AsyncFunction("hasExactAlarmPermission") {
      Scheduler.canScheduleExact(ctx())
    }

    AsyncFunction("openExactAlarmSettings") {
      val ctx = ctx()
      val intent = Scheduler.exactAlarmSettingsIntent().apply {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
          data = Uri.fromParts("package", ctx.packageName, null)
        }
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      ctx.startActivity(intent)
    }

    AsyncFunction("hasFullScreenIntentPermission") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return@AsyncFunction true
      val nm = ctx().getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.canUseFullScreenIntent()
    }

    AsyncFunction("openFullScreenIntentSettings") {
      val ctx = ctx()
      val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
          data = Uri.fromParts("package", ctx.packageName, null)
        }
      else
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.fromParts("package", ctx.packageName, null)
        }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
    }

    AsyncFunction("hasNotificationPermission") {
      NotificationManagerCompat.from(ctx()).areNotificationsEnabled()
    }

    AsyncFunction("getSystemRingtones") {
      val ctx = ctx()
      val out = mutableListOf<Map<String, Any?>>()
      val seenUris = mutableSetOf<String>()

      // Default alarm sound first.
      runCatching {
        val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        if (defaultUri != null) {
          val name = android.media.RingtoneManager.getRingtone(ctx, defaultUri)?.getTitle(ctx)
            ?: "System default alarm"
          out.add(mapOf(
            "id" to "sys:default-alarm",
            "name" to name,
            "uri" to defaultUri.toString(),
            "category" to "Default",
          ))
          seenUris.add(defaultUri.toString())
        }
      }

      // Alarm + Notification + Ringtone libraries.
      val types = listOf(
        RingtoneManager.TYPE_ALARM to "Alarms",
        RingtoneManager.TYPE_NOTIFICATION to "Notifications",
        RingtoneManager.TYPE_RINGTONE to "Ringtones",
      )
      for ((typeFlag, label) in types) {
        runCatching {
          val rm = RingtoneManager(ctx)
          rm.setType(typeFlag)
          val cursor = rm.cursor
          var idx = 0
          while (cursor.moveToNext()) {
            val uri = rm.getRingtoneUri(idx)
            idx++
            val uriString = uri?.toString() ?: continue
            if (seenUris.contains(uriString)) continue
            seenUris.add(uriString)
            val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX) ?: "Untitled"
            out.add(mapOf(
              "id" to "sys:${uriString.hashCode()}",
              "name" to title,
              "uri" to uriString,
              "category" to label,
            ))
          }
        }
      }
      out
    }
  }

  private fun ctx(): Context =
    appContext.reactContext ?: throw IllegalStateException("No reactContext")

  private fun Map<String, Any?>.toScheduledAlarm(): ScheduledAlarm = ScheduledAlarm(
    instanceId = (this["instanceId"] as? String) ?: error("instanceId required"),
    groupId = (this["groupId"] as? String).orEmpty(),
    triggerAtMs = (this["triggerAtMs"] as? Number)?.toLong() ?: error("triggerAtMs required"),
    label = (this["label"] as? String).orEmpty(),
    ringtoneUri = (this["ringtoneUri"] as? String).orEmpty(),
    backgroundUris = ((this["backgroundUris"] as? List<*>)?.mapNotNull { it as? String }) ?: emptyList(),
    dismissChallenge = (this["dismissChallenge"] as? String) ?: "none",
    challengeBlocksSnooze = (this["challengeBlocksSnooze"] as? Boolean) ?: false,
    vibrate = (this["vibrate"] as? Boolean) ?: true,
    snoozeMs = (this["snoozeMs"] as? Number)?.toLong() ?: (9L * 60_000L),
    snoozeMaxRepeats = (this["snoozeMaxRepeats"] as? Number)?.toInt() ?: 0,
    repeatDaysMask = (this["repeatDaysMask"] as? Number)?.toInt() ?: 0,
  )
}
