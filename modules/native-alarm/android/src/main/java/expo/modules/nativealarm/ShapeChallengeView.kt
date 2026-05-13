package expo.modules.nativealarm

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.MotionEvent
import android.view.View
import kotlin.math.hypot

/**
 * Trace-the-shape challenge. Draws a target polyline on the canvas; user must
 * drag a finger close enough to every sample along it. Coverage is computed
 * by walking the user path and marking each target sample as "hit" if any user
 * point is within {@link tolerancePx} of it. Pass when coverage >= 0.92.
 */
class ShapeChallengeView(
  context: Context,
  private val shape: ShapeLibrary.Shape,
) : View(context) {

  private val targetPath = Path()
  private val userPath = Path()
  private val targetSamplesAbs = FloatArray(shape.points.size * 2)
  private val hit = BooleanArray(shape.points.size)
  private val userPoints = mutableListOf<Pair<Float, Float>>()
  private var passed = false
  private var listener: ((Boolean) -> Unit)? = null

  private val targetPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#80FFFFFF")
    style = Paint.Style.STROKE
    strokeWidth = 10f
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }
  private val targetHitPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#FFD8C9A8")
    style = Paint.Style.STROKE
    strokeWidth = 10f
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }
  private val userPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#FFFFFFFF")
    style = Paint.Style.STROKE
    strokeWidth = 16f
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }
  private val passedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.parseColor("#FFD8C9A8")
    style = Paint.Style.STROKE
    strokeWidth = 16f
    strokeCap = Paint.Cap.ROUND
    strokeJoin = Paint.Join.ROUND
  }

  private val tolerancePx: Float get() = width.coerceAtMost(height) * 0.10f

  fun setOnChallengeResultListener(l: (Boolean) -> Unit) { listener = l }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    // Project the unit-square shape into absolute pixels.
    targetPath.reset()
    shape.points.forEachIndexed { i, (x, y) ->
      val ax = x * w
      val ay = y * h
      targetSamplesAbs[i * 2] = ax
      targetSamplesAbs[i * 2 + 1] = ay
      if (i == 0) targetPath.moveTo(ax, ay) else targetPath.lineTo(ax, ay)
    }
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (passed) return false
    when (event.action) {
      MotionEvent.ACTION_DOWN -> {
        userPath.reset()
        userPoints.clear()
        hit.fill(false)
        userPath.moveTo(event.x, event.y)
        userPoints.add(event.x to event.y)
        markHits(event.x, event.y)
        invalidate()
      }
      MotionEvent.ACTION_MOVE -> {
        userPath.lineTo(event.x, event.y)
        userPoints.add(event.x to event.y)
        markHits(event.x, event.y)
        invalidate()
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        val coverage = hit.count { it }.toFloat() / hit.size
        if (coverage >= 0.92f) {
          passed = true
          listener?.invoke(true)
        } else {
          // Allow retry: keep showing what they drew, then clear shortly.
          listener?.invoke(false)
          postDelayed({
            if (!passed) {
              userPath.reset()
              userPoints.clear()
              hit.fill(false)
              invalidate()
            }
          }, 500L)
        }
        invalidate()
      }
    }
    return true
  }

  private fun markHits(x: Float, y: Float) {
    val tol = tolerancePx
    for (i in hit.indices) {
      if (hit[i]) continue
      val tx = targetSamplesAbs[i * 2]
      val ty = targetSamplesAbs[i * 2 + 1]
      if (hypot((tx - x).toDouble(), (ty - y).toDouble()) <= tol) hit[i] = true
    }
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    // Underlay: faint dashed target.
    canvas.drawPath(targetPath, targetPaint)
    // Highlighted sections (hit samples).
    if (hit.any { it }) {
      val highlight = Path()
      var started = false
      for (i in hit.indices) {
        val x = targetSamplesAbs[i * 2]
        val y = targetSamplesAbs[i * 2 + 1]
        if (hit[i]) {
          if (!started) { highlight.moveTo(x, y); started = true } else highlight.lineTo(x, y)
        } else {
          started = false
        }
      }
      canvas.drawPath(highlight, targetHitPaint)
    }
    // User's strokes.
    canvas.drawPath(userPath, if (passed) passedPaint else userPaint)
  }
}
