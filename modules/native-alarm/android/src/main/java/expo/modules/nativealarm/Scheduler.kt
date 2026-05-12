package expo.modules.nativealarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import java.util.Calendar
import java.util.TimeZone

/**
 * Helpers around AlarmManager.setAlarmClock().
 *
 * - One alarm == one stable instanceId == one PendingIntent.
 * - The PendingIntent only carries instanceId; full payload lives in AlarmRegistry.
 * - Uses setAlarmClock so the alarm shows in the system status bar AND is exempt from Doze.
 */
object Scheduler {
  private const val REQUEST_PREFIX = "native_alarm:"

  fun requestCode(instanceId: String): Int = (REQUEST_PREFIX + instanceId).hashCode()

  fun pendingIntentFor(ctx: Context, instanceId: String, flagsExtra: Int = 0): PendingIntent {
    val intent = Intent(ctx, AlarmReceiver::class.java).apply {
      action = AlarmReceiver.ACTION_FIRE
      putExtra(AlarmReceiver.EXTRA_INSTANCE_ID, instanceId)
      // Make the intent unique so PendingIntent.FLAG_UPDATE_CURRENT
      // discriminates per-instance.
      data = android.net.Uri.parse("nativealarm://$instanceId")
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      PendingIntent.FLAG_IMMUTABLE or flagsExtra
    return PendingIntent.getBroadcast(ctx, requestCode(instanceId), intent, flags)
  }

  fun schedule(ctx: Context, alarm: ScheduledAlarm) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
      // No permission — surface as exception; caller (JS) should check first.
      throw SecurityException("SCHEDULE_EXACT_ALARM permission not granted")
    }
    AlarmRegistry.put(ctx, alarm)
    val showIntent = PendingIntent.getActivity(
      ctx, requestCode("show:" + alarm.instanceId),
      Intent(ctx, RingingActivity::class.java).apply {
        putExtra(RingingActivity.EXTRA_INSTANCE_ID, alarm.instanceId)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val info = AlarmManager.AlarmClockInfo(alarm.triggerAtMs, showIntent)
    am.setAlarmClock(info, pendingIntentFor(ctx, alarm.instanceId))
  }

  fun cancel(ctx: Context, instanceId: String) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(pendingIntentFor(ctx, instanceId))
    AlarmRegistry.remove(ctx, instanceId)
  }

  fun cancelGroup(ctx: Context, groupId: String) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    AlarmRegistry.all(ctx).filter { it.groupId == groupId }.forEach {
      am.cancel(pendingIntentFor(ctx, it.instanceId))
    }
    AlarmRegistry.removeGroup(ctx, groupId)
  }

  fun cancelAll(ctx: Context) {
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    AlarmRegistry.all(ctx).forEach {
      am.cancel(pendingIntentFor(ctx, it.instanceId))
    }
    AlarmRegistry.clear(ctx)
  }

  fun snooze(ctx: Context, instanceId: String) {
    val current = AlarmRegistry.get(ctx, instanceId) ?: return
    if (current.snoozeMaxRepeats > 0 && current.snoozeCount >= current.snoozeMaxRepeats) {
      finishOneShot(ctx, current)
      return
    }
    val next = current.copy(
      triggerAtMs = System.currentTimeMillis() + current.snoozeMs,
      snoozeCount = current.snoozeCount + 1,
    )
    schedule(ctx, next)
  }

  /**
   * Called from RingingActivity after the user taps Dismiss.
   * - One-shot (repeatDaysMask == 0): remove from the registry.
   * - Repeating: compute the next weekly occurrence and re-arm.
   */
  fun onDismiss(ctx: Context, instanceId: String): Long? {
    val current = AlarmRegistry.get(ctx, instanceId) ?: return null
    if (current.repeatDaysMask == 0) {
      finishOneShot(ctx, current)
      return null
    }
    val nextMs = nextWeeklyOccurrenceMs(current.triggerAtMs, current.repeatDaysMask)
    val rearmed = current.copy(triggerAtMs = nextMs, snoozeCount = 0)
    schedule(ctx, rearmed)
    return nextMs
  }

  private fun finishOneShot(ctx: Context, alarm: ScheduledAlarm) {
    cancel(ctx, alarm.instanceId)
  }

  /**
   * Given a base time-of-day (extracted from a reference epoch ms) and a day-of-week
   * bitmask (Sun=1, Mon=2, ..., Sat=64), return the next epoch ms strictly after now
   * whose weekday is in the mask.
   */
  fun nextWeeklyOccurrenceMs(referenceMs: Long, repeatDaysMask: Int): Long {
    val tz = TimeZone.getDefault()
    val ref = Calendar.getInstance(tz).apply { timeInMillis = referenceMs }
    val hour = ref.get(Calendar.HOUR_OF_DAY)
    val minute = ref.get(Calendar.MINUTE)
    val now = Calendar.getInstance(tz)
    for (offset in 1..7) {
      val candidate = (now.clone() as Calendar).apply {
        add(Calendar.DAY_OF_YEAR, offset)
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }
      val cdow = candidate.get(Calendar.DAY_OF_WEEK) // Sun=1..Sat=7
      val bit = 1 shl (cdow - 1)
      if ((repeatDaysMask and bit) != 0 && candidate.timeInMillis > now.timeInMillis) {
        return candidate.timeInMillis
      }
    }
    // Fallback: tomorrow same time (shouldn't happen if mask is non-zero).
    val tomorrow = (now.clone() as Calendar).apply {
      add(Calendar.DAY_OF_YEAR, 1)
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    return tomorrow.timeInMillis
  }

  fun canScheduleExact(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
  }

  fun exactAlarmSettingsIntent(): Intent =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
      Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
    else
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
}
