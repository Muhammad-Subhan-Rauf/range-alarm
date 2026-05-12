package expo.modules.nativealarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Full-screen UI for an active alarm. Playback / vibration / lifetime are owned
 * by RingingService; this Activity only renders the dismiss/snooze controls
 * and forwards user input back to the service.
 */
class RingingActivity : Activity() {

  private var instanceId: String? = null
  private val tickHandler = Handler(Looper.getMainLooper())
  private var clockView: TextView? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setupWindow()
    instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID)
    val alarm = instanceId?.let { AlarmRegistry.get(this, it) }
    setContentView(buildUi(alarm?.label.orEmpty()))
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID)
  }

  override fun onDestroy() {
    super.onDestroy()
    tickHandler.removeCallbacksAndMessages(null)
  }

  override fun onBackPressed() {
    // Swallow back to prevent accidental dismissal.
  }

  @Suppress("DEPRECATION")
  private fun setupWindow() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD,
    )
    val km = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      km?.requestDismissKeyguard(this, null)
    }
    window.statusBarColor = Color.parseColor("#0B0B14")
    window.navigationBarColor = Color.parseColor("#0B0B14")
  }

  private fun buildUi(label: String): View {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0B0B14"))
      setPadding(dp(32), dp(64), dp(32), dp(64))
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }
    val clock = TextView(this).apply {
      textSize = 84f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      text = currentClock()
    }
    clockView = clock
    val labelView = TextView(this).apply {
      textSize = 22f
      setTextColor(Color.parseColor("#A9B0C9"))
      gravity = Gravity.CENTER
      text = label.ifBlank { "Alarm" }
      setPadding(0, dp(16), 0, dp(64))
    }
    val buttonRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, dp(24), 0, 0)
    }
    val snoozeBtn = Button(this).apply {
      text = "SNOOZE"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.parseColor("#3A3F58"))
      setPadding(dp(32), dp(20), dp(32), dp(20))
      setOnClickListener { onSnooze() }
    }
    val dismissBtn = Button(this).apply {
      text = "DISMISS"
      setTextColor(Color.parseColor("#0B0B14"))
      setBackgroundColor(Color.parseColor("#7BE0BE"))
      setPadding(dp(32), dp(20), dp(32), dp(20))
      setOnClickListener { onDismiss() }
    }
    buttonRow.addView(snoozeBtn, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
      marginEnd = dp(8)
    })
    buttonRow.addView(dismissBtn, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
      marginStart = dp(8)
    })
    root.addView(clock)
    root.addView(labelView)
    root.addView(buttonRow)
    scheduleClockTick()
    return root
  }

  private fun scheduleClockTick() {
    tickHandler.postDelayed(object : Runnable {
      override fun run() {
        clockView?.text = currentClock()
        tickHandler.postDelayed(this, 1000L)
      }
    }, 1000L)
  }

  private fun currentClock(): String =
    SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())

  private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

  private fun onSnooze() {
    startService(
      Intent(this, RingingService::class.java).setAction(RingingService.ACTION_SNOOZE),
    )
    finishAndRemoveTask()
  }

  private fun onDismiss() {
    startService(
      Intent(this, RingingService::class.java).setAction(RingingService.ACTION_DISMISS),
    )
    finishAndRemoveTask()
  }

  companion object {
    const val EXTRA_INSTANCE_ID = "instanceId"
  }
}
