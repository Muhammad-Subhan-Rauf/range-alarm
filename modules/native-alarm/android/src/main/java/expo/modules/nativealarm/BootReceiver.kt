package expo.modules.nativealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * AlarmManager state is lost on reboot. Re-arm every future alarm from the registry.
 * Stale (already-past, non-repeating) alarms are dropped.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED &&
      action != "android.intent.action.LOCKED_BOOT_COMPLETED" &&
      action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      action != "android.intent.action.QUICKBOOT_POWERON"
    ) return

    if (!Scheduler.canScheduleExact(context)) return

    val now = System.currentTimeMillis()
    AlarmRegistry.all(context).forEach { alarm ->
      when {
        alarm.triggerAtMs > now -> runCatching { Scheduler.schedule(context, alarm) }
        alarm.repeatDaysMask != 0 -> {
          val next = Scheduler.nextWeeklyOccurrenceMs(alarm.triggerAtMs, alarm.repeatDaysMask)
          runCatching {
            Scheduler.schedule(context, alarm.copy(triggerAtMs = next, snoozeCount = 0))
          }
        }
        else -> AlarmRegistry.remove(context, alarm.instanceId)
      }
    }
  }
}
