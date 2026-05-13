package expo.modules.nativealarm

import org.json.JSONArray
import org.json.JSONObject

data class ScheduledAlarm(
  val instanceId: String,
  val groupId: String,
  val triggerAtMs: Long,
  val label: String,
  val ringtoneUri: String,
  val backgroundUris: List<String>,
  val vibrate: Boolean,
  val snoozeMs: Long,
  val snoozeMaxRepeats: Int,
  val repeatDaysMask: Int,
  val snoozeCount: Int = 0,
) {
  fun toJson(): String = JSONObject().apply {
    put("instanceId", instanceId)
    put("groupId", groupId)
    put("triggerAtMs", triggerAtMs)
    put("label", label)
    put("ringtoneUri", ringtoneUri)
    put("backgroundUris", JSONArray(backgroundUris))
    put("vibrate", vibrate)
    put("snoozeMs", snoozeMs)
    put("snoozeMaxRepeats", snoozeMaxRepeats)
    put("repeatDaysMask", repeatDaysMask)
    put("snoozeCount", snoozeCount)
  }.toString()

  companion object {
    fun fromJson(raw: String): ScheduledAlarm {
      val o = JSONObject(raw)
      val arr = o.optJSONArray("backgroundUris")
      val uris = mutableListOf<String>()
      if (arr != null) {
        for (i in 0 until arr.length()) uris.add(arr.optString(i))
      } else {
        // Backward compat with older payloads that stored a single string.
        val single = o.optString("backgroundUri", "")
        if (single.isNotBlank()) uris.add(single)
      }
      return ScheduledAlarm(
        instanceId = o.getString("instanceId"),
        groupId = o.getString("groupId"),
        triggerAtMs = o.getLong("triggerAtMs"),
        label = o.optString("label", ""),
        ringtoneUri = o.optString("ringtoneUri", ""),
        backgroundUris = uris,
        vibrate = o.optBoolean("vibrate", true),
        snoozeMs = o.optLong("snoozeMs", 9 * 60_000L),
        snoozeMaxRepeats = o.optInt("snoozeMaxRepeats", 0),
        repeatDaysMask = o.optInt("repeatDaysMask", 0),
        snoozeCount = o.optInt("snoozeCount", 0),
      )
    }
  }
}
