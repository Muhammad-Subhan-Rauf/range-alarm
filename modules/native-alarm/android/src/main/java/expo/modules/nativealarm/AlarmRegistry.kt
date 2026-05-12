package expo.modules.nativealarm

import android.content.Context
import android.content.SharedPreferences

/**
 * SharedPreferences-backed mirror of every scheduled alarm.
 * - Written by JS through NativeAlarmModule.
 * - Read by AlarmReceiver (the JS bridge may be dead at fire time).
 * - Read by BootReceiver to re-arm everything after a device reboot.
 */
object AlarmRegistry {
  private const val PREFS = "native_alarm_registry"

  private fun prefs(ctx: Context): SharedPreferences =
    ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun put(ctx: Context, alarm: ScheduledAlarm) {
    prefs(ctx).edit().putString(alarm.instanceId, alarm.toJson()).apply()
  }

  fun get(ctx: Context, instanceId: String): ScheduledAlarm? {
    val raw = prefs(ctx).getString(instanceId, null) ?: return null
    return runCatching { ScheduledAlarm.fromJson(raw) }.getOrNull()
  }

  fun remove(ctx: Context, instanceId: String) {
    prefs(ctx).edit().remove(instanceId).apply()
  }

  fun removeGroup(ctx: Context, groupId: String) {
    val p = prefs(ctx)
    val editor = p.edit()
    p.all.forEach { (k, v) ->
      if (v is String) {
        runCatching {
          val a = ScheduledAlarm.fromJson(v)
          if (a.groupId == groupId) editor.remove(k)
        }
      }
    }
    editor.apply()
  }

  fun clear(ctx: Context) {
    prefs(ctx).edit().clear().apply()
  }

  fun all(ctx: Context): List<ScheduledAlarm> {
    val p = prefs(ctx)
    return p.all.values.mapNotNull { v ->
      if (v is String) runCatching { ScheduledAlarm.fromJson(v) }.getOrNull() else null
    }
  }
}
