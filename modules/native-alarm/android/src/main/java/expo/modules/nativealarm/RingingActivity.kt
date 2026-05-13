package expo.modules.nativealarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Full-screen UI for an active alarm. Playback / vibration / lifetime are owned
 * by RingingService; this Activity only renders the dismiss/snooze controls
 * and forwards user input back to the service.
 *
 * If the payload includes background URIs, they're shown as a crossfading
 * slideshow with a slow Ken Burns pan whose direction alternates per image.
 */
class RingingActivity : Activity() {

  private var instanceId: String? = null
  private val tickHandler = Handler(Looper.getMainLooper())
  private val slideshowHandler = Handler(Looper.getMainLooper())
  private var clockView: TextView? = null
  private var slideshowImageViews: Array<ImageView>? = null
  private var slideshowCurrent = 0
  private var slideshowIndex = 0
  private var slideshowUris: List<String> = emptyList()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setupWindow()
    instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID)
    val alarm = instanceId?.let { AlarmRegistry.get(this, it) }
    setContentView(buildUi(alarm?.label.orEmpty(), alarm?.backgroundUris ?: emptyList()))
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID)
  }

  override fun onDestroy() {
    super.onDestroy()
    tickHandler.removeCallbacksAndMessages(null)
    slideshowHandler.removeCallbacksAndMessages(null)
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
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT
  }

  private fun buildUi(label: String, backgroundUris: List<String>): View {
    val outer = FrameLayout(this).apply {
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
      setBackgroundColor(Color.parseColor("#0E0E10"))
    }

    // Slideshow stack: two ImageViews that crossfade between source bitmaps.
    val pool = backgroundUris.filter { uri ->
      runCatching {
        val parsed = Uri.parse(uri)
        val path = parsed.path ?: uri
        File(path).exists()
      }.getOrDefault(false)
    }
    if (pool.isNotEmpty()) {
      val ivs = Array(2) {
        ImageView(this).apply {
          scaleType = ImageView.ScaleType.CENTER_CROP
          layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
          )
          alpha = 0f
        }
      }
      ivs.forEach { outer.addView(it) }
      slideshowImageViews = ivs
      slideshowUris = pool

      val scrim = View(this).apply {
        background = GradientDrawable(
          GradientDrawable.Orientation.TOP_BOTTOM,
          intArrayOf(
            Color.parseColor("#B3000000"),
            Color.parseColor("#66000000"),
            Color.parseColor("#B3000000"),
          ),
        )
        layoutParams = FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        )
      }
      outer.addView(scrim)
      startSlideshow(immediate = true)
    }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
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
      setShadowLayer(8f, 0f, 2f, Color.parseColor("#80000000"))
    }
    clockView = clock
    val labelView = TextView(this).apply {
      textSize = 22f
      setTextColor(Color.parseColor("#E6FFFFFF"))
      gravity = Gravity.CENTER
      text = label.ifBlank { "Alarm" }
      setPadding(0, dp(16), 0, dp(64))
      setShadowLayer(6f, 0f, 2f, Color.parseColor("#80000000"))
    }
    val buttonRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, dp(24), 0, 0)
    }
    val snoozeBtn = Button(this).apply {
      text = "SNOOZE"
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.parseColor("#403A3F58"))
      setPadding(dp(32), dp(20), dp(32), dp(20))
      setOnClickListener { onSnooze() }
    }
    val dismissBtn = Button(this).apply {
      text = "DISMISS"
      setTextColor(Color.parseColor("#0B0B14"))
      setBackgroundColor(Color.parseColor("#D8C9A8"))
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
    outer.addView(root)
    return outer
  }

  // ---- Slideshow ---------------------------------------------------------

  private val slideDurationMs = 8000L
  private val crossfadeMs = 1200L

  private fun startSlideshow(immediate: Boolean) {
    val ivs = slideshowImageViews ?: return
    if (slideshowUris.isEmpty()) return
    val nextIdx = slideshowIndex % slideshowUris.size
    val uri = slideshowUris[nextIdx]
    val bmp = runCatching {
      val parsed = Uri.parse(uri)
      val path = parsed.path ?: uri
      BitmapFactory.decodeFile(path)
    }.getOrNull()
    if (bmp == null) {
      slideshowIndex++
      slideshowHandler.postDelayed({ startSlideshow(immediate) }, 50)
      return
    }
    val incoming = ivs[1 - slideshowCurrent]
    val outgoing = ivs[slideshowCurrent]
    incoming.setImageBitmap(bmp)
    incoming.alpha = if (immediate) 1f else 0f

    // Ken Burns: alternate horizontal pan direction per slide, with a slight zoom.
    val direction = if (slideshowIndex % 2 == 0) 1f else -1f
    val pan = dp(36).toFloat()
    incoming.translationX = -pan * direction
    incoming.scaleX = 1f
    incoming.scaleY = 1f
    incoming.animate()
      .translationX(pan * direction)
      .scaleX(1.08f)
      .scaleY(1.08f)
      .alpha(1f)
      .setDuration(slideDurationMs + crossfadeMs)
      .setInterpolator(AccelerateDecelerateInterpolator())
      .start()

    if (!immediate) {
      outgoing.animate()
        .alpha(0f)
        .setDuration(crossfadeMs)
        .start()
    }
    slideshowCurrent = 1 - slideshowCurrent
    slideshowIndex++

    if (slideshowUris.size > 1) {
      slideshowHandler.postDelayed({ startSlideshow(false) }, slideDurationMs)
    }
  }

  // ---- Clock + helpers ---------------------------------------------------

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
