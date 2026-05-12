package expo.modules.nativealarm

import android.os.Bundle

/**
 * Simple thread-safe bus the RingingActivity uses to notify the JS module of
 * fired / dismissed / snoozed events. The module registers a single listener
 * on creation; when no module is alive (app killed), events queue and replay
 * when JS reconnects.
 */
object NativeAlarmEventBus {
  interface Listener {
    fun onEvent(name: String, body: Bundle)
  }

  private var listener: Listener? = null
  private val queue = ArrayDeque<Pair<String, Bundle>>()

  @Synchronized
  fun setListener(l: Listener?) {
    listener = l
    if (l != null) {
      while (queue.isNotEmpty()) {
        val (n, b) = queue.removeFirst()
        l.onEvent(n, b)
      }
    }
  }

  @Synchronized
  private fun dispatch(name: String, body: Bundle) {
    val l = listener
    if (l != null) l.onEvent(name, body)
    else queue.addLast(name to body)
  }

  fun emitFired(instanceId: String, groupId: String) {
    dispatch(
      "onAlarmFired",
      Bundle().apply {
        putString("instanceId", instanceId)
        putString("groupId", groupId)
        putLong("firedAtMs", System.currentTimeMillis())
      },
    )
  }

  fun emitDismissed(instanceId: String, groupId: String) {
    dispatch(
      "onAlarmDismissed",
      Bundle().apply {
        putString("instanceId", instanceId)
        putString("groupId", groupId)
      },
    )
  }

  fun emitSnoozed(instanceId: String, groupId: String, nextTriggerAtMs: Long) {
    dispatch(
      "onAlarmSnoozed",
      Bundle().apply {
        putString("instanceId", instanceId)
        putString("groupId", groupId)
        putLong("nextTriggerAtMs", nextTriggerAtMs)
      },
    )
  }
}
