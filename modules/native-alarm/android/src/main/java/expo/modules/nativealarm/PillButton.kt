package expo.modules.nativealarm

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.content.res.ColorStateList
import android.view.Gravity
import android.view.MotionEvent
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Pill-shaped alarm action button. `primary=true` uses the accent fill; false
 * uses a glassy translucent fill. Supports a locked state (50% alpha + touch
 * absorption) used while the dismiss challenge is pending.
 */
class PillButton(
  context: Context,
  label: String,
  primary: Boolean,
  private val onClick: () -> Unit,
) : LinearLayout(context) {

  private val text = TextView(context).apply {
    text = label
    textSize = 15f
    setTextColor(if (primary) Color.parseColor("#0E0E10") else Color.WHITE)
    typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
    gravity = Gravity.CENTER
    letterSpacing = 0.14f
  }

  private val bg = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = dp(40).toFloat()
    setColor(if (primary) Color.parseColor("#D8C9A8") else Color.parseColor("#332A2A33"))
    if (!primary) setStroke(dp(1), Color.parseColor("#66FFFFFF"))
  }

  private var locked = false

  init {
    orientation = HORIZONTAL
    gravity = Gravity.CENTER
    setPadding(dp(20), dp(18), dp(20), dp(18))
    layoutParams = LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    background = RippleDrawable(
      ColorStateList.valueOf(Color.parseColor("#33FFFFFF")),
      bg,
      null,
    )
    addView(text, LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    isClickable = true
    isFocusable = true
    setOnClickListener {
      if (!locked) {
        animatePress()
        onClick()
      }
    }
  }

  fun setLocked(value: Boolean) {
    locked = value
    animate().alpha(if (value) 0.45f else 1f).setDuration(220).start()
  }

  private fun animatePress() {
    val anim = ValueAnimator.ofFloat(1f, 0.94f, 1f)
    anim.duration = 220
    anim.addUpdateListener { v ->
      val s = v.animatedValue as Float
      scaleX = s
      scaleY = s
    }
    anim.start()
  }

  override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean {
    return locked || super.onInterceptTouchEvent(ev)
  }

  private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}
