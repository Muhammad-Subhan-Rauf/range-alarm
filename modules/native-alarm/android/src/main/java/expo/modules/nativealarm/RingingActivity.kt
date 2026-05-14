package expo.modules.nativealarm

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.format.DateFormat
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Full-screen UI for an active alarm.
 *  - Slideshow + Ken Burns pan in the background.
 *  - Greeting, big clock, date, label, two pill buttons.
 *  - Optional dismiss challenge (trace today's shape) that gates the Dismiss
 *    button.
 * Lifetime is owned by RingingService; this Activity only renders and forwards
 * Snooze/Dismiss user intent back.
 */
class RingingActivity : Activity() {

  private var instanceId: String? = null
  private var dismissButton: PillButton? = null
  private var snoozeButton: PillButton? = null
  private val tickHandler = Handler(Looper.getMainLooper())
  private val slideshowHandler = Handler(Looper.getMainLooper())
  private var clockView: TextView? = null
  private var slideshowImageViews: Array<ImageView>? = null
  private var slideshowCurrent = 0
  private var slideshowIndex = 0
  private var slideshowUris: List<String> = emptyList()
  private var dismissRequiresChallenge = false
  private var snoozeRequiresChallenge = false
  private var challengeUnlocked = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setupWindow()
    instanceId = intent.getStringExtra(EXTRA_INSTANCE_ID)
    val alarm = instanceId?.let { AlarmRegistry.get(this, it) }
    dismissRequiresChallenge = alarm?.dismissChallenge == "shape"
    snoozeRequiresChallenge = dismissRequiresChallenge && alarm?.challengeBlocksSnooze == true
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
            Color.parseColor("#CC000000"),
            Color.parseColor("#33000000"),
            Color.parseColor("#CC000000"),
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
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(28), dp(64), dp(28), dp(56))
      layoutParams = FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    val greeting = TextView(this).apply {
      text = greetingForNow()
      textSize = 16f
      setTextColor(Color.parseColor("#D8C9A8"))
      letterSpacing = 0.18f
      typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
      gravity = Gravity.CENTER
      setShadowLayer(5f, 0f, 2f, Color.parseColor("#80000000"))
    }

    val clock = TextView(this).apply {
      textSize = 96f
      setTextColor(Color.WHITE)
      typeface = Typeface.create("sans-serif-thin", Typeface.NORMAL)
      gravity = Gravity.CENTER
      text = currentClock()
      setShadowLayer(10f, 0f, 4f, Color.parseColor("#80000000"))
      setPadding(0, dp(8), 0, 0)
    }
    clockView = clock

    val date = TextView(this).apply {
      textSize = 16f
      setTextColor(Color.parseColor("#E6FFFFFF"))
      typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
      gravity = Gravity.CENTER
      text = SimpleDateFormat("EEEE, d MMM", Locale.getDefault()).format(Date())
      setShadowLayer(5f, 0f, 2f, Color.parseColor("#80000000"))
      setPadding(0, dp(4), 0, 0)
    }

    val labelView = TextView(this).apply {
      textSize = 18f
      setTextColor(Color.WHITE)
      typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.NORMAL)
      gravity = Gravity.CENTER
      text = label.ifBlank { "Alarm" }
      setShadowLayer(6f, 0f, 2f, Color.parseColor("#80000000"))
      setPadding(0, dp(28), 0, 0)
    }

    root.addView(greeting)
    root.addView(clock)
    root.addView(date)
    root.addView(labelView)

    // Optional challenge gate.
    if (dismissRequiresChallenge) {
      val todayShape = ShapeLibrary.random()
      val challengeWrap = FrameLayout(this).apply {
        background = GradientDrawable().apply {
          shape = GradientDrawable.RECTANGLE
          cornerRadius = dp(20).toFloat()
          setColor(Color.parseColor("#33FFFFFF"))
          setStroke(dp(1), Color.parseColor("#66FFFFFF"))
        }
        val lp = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          dp(260),
        )
        lp.topMargin = dp(28)
        layoutParams = lp
        setPadding(dp(8), dp(8), dp(8), dp(8))
      }
      val hint = TextView(this).apply {
        text = "Trace the shape to dismiss"
        textSize = 13f
        setTextColor(Color.parseColor("#E6FFFFFF"))
        gravity = Gravity.CENTER
        letterSpacing = 0.06f
        layoutParams = FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.WRAP_CONTENT,
          Gravity.TOP or Gravity.CENTER_HORIZONTAL,
        ).apply { topMargin = dp(10) }
        setShadowLayer(4f, 0f, 1f, Color.parseColor("#80000000"))
      }
      val challenge = ShapeChallengeView(this, todayShape).apply {
        layoutParams = FrameLayout.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT,
        ).apply {
          topMargin = dp(30)
        }
        setOnChallengeResultListener { passed -> if (passed) onChallengePassed() }
      }
      challengeWrap.addView(challenge)
      challengeWrap.addView(hint)
      root.addView(challengeWrap)
    }

    // Pill buttons.
    val buttonRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply {
        topMargin = dp(36)
      }
      layoutParams = lp
    }
    val snoozeBtn = PillButton(this, "SNOOZE", primary = false) { onSnooze() }
    val dismissBtn = PillButton(this, "DISMISS", primary = true) { onDismiss() }
    dismissButton = dismissBtn
    snoozeButton = snoozeBtn
    if (dismissRequiresChallenge) dismissBtn.setLocked(true)
    if (snoozeRequiresChallenge) snoozeBtn.setLocked(true)

    buttonRow.addView(snoozeBtn, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
      marginEnd = dp(8)
    })
    buttonRow.addView(dismissBtn, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
      marginStart = dp(8)
    })
    root.addView(buttonRow)
    scheduleClockTick()
    outer.addView(root)
    return outer
  }

  private fun greetingForNow(): String {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
      hour in 5..11 -> "GOOD MORNING"
      hour in 12..16 -> "GOOD AFTERNOON"
      hour in 17..21 -> "GOOD EVENING"
      else -> "GOOD NIGHT"
    }
  }

  private fun onChallengePassed() {
    challengeUnlocked = true
    dismissButton?.setLocked(false)
    snoozeButton?.setLocked(false)
  }

  override fun onKeyDown(keyCode: Int, event: android.view.KeyEvent?): Boolean {
    // Swallow volume keys so they can't be used to silence/snooze the alarm
    // when the challenge is active. (Stock Android often maps volume = snooze.)
    return when (keyCode) {
      android.view.KeyEvent.KEYCODE_VOLUME_UP,
      android.view.KeyEvent.KEYCODE_VOLUME_DOWN,
      android.view.KeyEvent.KEYCODE_VOLUME_MUTE -> {
        if (dismissRequiresChallenge || snoozeRequiresChallenge) true
        else super.onKeyDown(keyCode, event)
      }
      else -> super.onKeyDown(keyCode, event)
    }
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
      outgoing.animate().alpha(0f).setDuration(crossfadeMs).start()
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

  private fun currentClock(): String {
    val fmt = if (DateFormat.is24HourFormat(this)) "HH:mm" else "h:mm"
    return SimpleDateFormat(fmt, Locale.getDefault()).format(Date())
  }

  private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

  private fun onSnooze() {
    if (snoozeRequiresChallenge && !challengeUnlocked) return
    startService(
      Intent(this, RingingService::class.java).setAction(RingingService.ACTION_SNOOZE),
    )
    finishAndRemoveTask()
  }

  private fun onDismiss() {
    if (dismissRequiresChallenge && !challengeUnlocked) return
    startService(
      Intent(this, RingingService::class.java).setAction(RingingService.ACTION_DISMISS),
    )
    finishAndRemoveTask()
  }

  companion object {
    const val EXTRA_INSTANCE_ID = "instanceId"
  }
}
