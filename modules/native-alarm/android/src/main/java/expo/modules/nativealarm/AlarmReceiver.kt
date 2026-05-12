package expo.modules.nativealarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Receives the AlarmManager broadcast and immediately delegates to RingingService,
 * which holds the foreground status so audio + UI keep running even when the
 * app is killed and Android 14's background-launch restrictions apply.
 */
class AlarmReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID) ?: return
    val svc = Intent(context, RingingService::class.java).apply {
      putExtra(RingingService.EXTRA_INSTANCE_ID, instanceId)
    }
    ContextCompat.startForegroundService(context, svc)
  }

  companion object {
    const val ACTION_FIRE = "expo.modules.nativealarm.FIRE"
    const val EXTRA_INSTANCE_ID = "instanceId"
  }
}
