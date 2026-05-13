package expo.modules.nativealarm

import java.util.Calendar

/**
 * Shape definitions for the dismiss challenge. Each shape is a list of (x, y)
 * coordinates in the unit square [0, 1]. ShapeChallengeView scales them to the
 * canvas size and asks the user to trace them.
 *
 * The set picked for "today" is seeded by the calendar date so it stays the
 * same across multiple alarms in the same day but rotates daily.
 */
object ShapeLibrary {

  data class Shape(val name: String, val points: List<Pair<Float, Float>>)

  private val SHAPES: List<Shape> = listOf(
    Shape("zigzag", buildList {
      for (i in 0..40) {
        val t = i / 40f
        val x = t
        val y = 0.5f + 0.25f * if ((i / 5) % 2 == 0) (((i % 5) / 5f) - 0.5f) * 2f else -(((i % 5) / 5f) - 0.5f) * 2f
        add(x to y.coerceIn(0.15f, 0.85f))
      }
    }),
    Shape("wave", buildList {
      for (i in 0..80) {
        val t = i / 80f
        val x = t
        val y = 0.5f + 0.3f * kotlin.math.sin(t * Math.PI * 3).toFloat()
        add(x to y.coerceIn(0.1f, 0.9f))
      }
    }),
    Shape("spiral", buildList {
      for (i in 0..120) {
        val t = i / 120f
        val angle = t * Math.PI * 4
        val r = 0.05f + t * 0.35f
        val x = 0.5f + (r * kotlin.math.cos(angle)).toFloat()
        val y = 0.5f + (r * kotlin.math.sin(angle)).toFloat()
        add(x to y)
      }
    }),
    Shape("S-curve", buildList {
      for (i in 0..80) {
        val t = i / 80f
        val angle = t * Math.PI * 2 - Math.PI / 2
        val x = 0.5f + 0.35f * kotlin.math.sin(angle).toFloat()
        val y = 0.15f + t * 0.7f
        add(x to y)
      }
    }),
    Shape("M", buildList {
      val pts = listOf(
        0.15f to 0.85f, 0.30f to 0.15f, 0.50f to 0.55f,
        0.70f to 0.15f, 0.85f to 0.85f,
      )
      addAll(interpolate(pts, 80))
    }),
    Shape("triangle", buildList {
      val pts = listOf(
        0.5f to 0.15f, 0.85f to 0.80f, 0.15f to 0.80f, 0.5f to 0.15f,
      )
      addAll(interpolate(pts, 90))
    }),
    Shape("infinity", buildList {
      for (i in 0..120) {
        val t = i / 120f
        val angle = t * Math.PI * 2
        val s = kotlin.math.sin(angle).toFloat()
        val c = kotlin.math.cos(angle).toFloat()
        val denom = 1f + s * s
        val x = 0.5f + 0.35f * c / denom
        val y = 0.5f + 0.25f * s * c / denom
        add(x to y)
      }
    }),
    Shape("heart", buildList {
      for (i in 0..100) {
        val t = i / 100f
        val angle = t * Math.PI * 2
        val s = kotlin.math.sin(angle).toFloat()
        val c = kotlin.math.cos(angle).toFloat()
        val x = 0.5f + 0.04f * 16 * s * s * s / 16
        val y = 0.5f - 0.04f * (13 * c - 5 * kotlin.math.cos(2 * angle).toFloat()
          - 2 * kotlin.math.cos(3 * angle).toFloat() - kotlin.math.cos(4 * angle).toFloat()) / 16
        add(x.coerceIn(0.1f, 0.9f) to y.coerceIn(0.1f, 0.9f))
      }
    }),
    Shape("Z", buildList {
      val pts = listOf(
        0.15f to 0.20f, 0.85f to 0.20f,
        0.15f to 0.80f, 0.85f to 0.80f,
      )
      addAll(interpolate(pts, 90))
    }),
  )

  /** Interpolate a polyline into N evenly-spaced points. */
  private fun interpolate(corners: List<Pair<Float, Float>>, samples: Int): List<Pair<Float, Float>> {
    if (corners.size < 2) return corners
    val out = mutableListOf<Pair<Float, Float>>()
    // Compute segment lengths
    val segs = (0 until corners.size - 1).map { i ->
      val (x1, y1) = corners[i]
      val (x2, y2) = corners[i + 1]
      kotlin.math.hypot((x2 - x1).toDouble(), (y2 - y1).toDouble()).toFloat()
    }
    val total = segs.sum().takeIf { it > 0f } ?: return corners
    for (i in 0..samples) {
      val t = i / samples.toFloat()
      var target = t * total
      var seg = 0
      while (seg < segs.size - 1 && target > segs[seg]) {
        target -= segs[seg]
        seg++
      }
      val localT = (target / segs[seg]).coerceIn(0f, 1f)
      val (x1, y1) = corners[seg]
      val (x2, y2) = corners[seg + 1]
      out.add(x1 + (x2 - x1) * localT to y1 + (y2 - y1) * localT)
    }
    return out
  }

  /** Pick today's shape — same shape all day, rotates daily. */
  fun forToday(): Shape {
    val cal = Calendar.getInstance()
    val day = cal.get(Calendar.YEAR) * 1000 + cal.get(Calendar.DAY_OF_YEAR)
    return SHAPES[day % SHAPES.size]
  }
}
