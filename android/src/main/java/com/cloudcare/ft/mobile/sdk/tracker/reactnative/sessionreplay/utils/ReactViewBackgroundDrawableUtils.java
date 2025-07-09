/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ColorUtils;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;
import com.ft.sdk.sessionreplay.utils.Utils;

public class ReactViewBackgroundDrawableUtils {
  private final ReflectionUtils reflectionUtils;
  private static final String COLOR_FIELD_NAME = "mColor";

  public ReactViewBackgroundDrawableUtils() {
    this(new ReflectionUtils());
  }

  public ReactViewBackgroundDrawableUtils(ReflectionUtils reflectionUtils) {
    this.reflectionUtils = reflectionUtils;
  }

  public ShapeAndBorder resolveShapeAndBorder(
    ReactViewBackgroundDrawable drawable,
    float opacity,
    float pixelDensity
  ) {
    ShapeBorder borderProps = resolveBorder(drawable, pixelDensity);
    Integer backgroundColor = getBackgroundColor(drawable);
    String colorHexString = null;
    if (backgroundColor != null) {
      colorHexString = ColorUtils.formatAsRgba(backgroundColor);
    } else {
      return new ShapeAndBorder(null, borderProps);
    }

    long cornerRadius = Utils.densityNormalized((long) drawable.getFullBorderRadius(), pixelDensity);

    ShapeStyle shapeStyle = new ShapeStyle(
      colorHexString,
      opacity,
      cornerRadius
    );
    return new ShapeAndBorder(shapeStyle, borderProps);
  }

  private Integer getBackgroundColor(ReactViewBackgroundDrawable backgroundDrawable) {
    return (Integer) reflectionUtils.getDeclaredField(
      backgroundDrawable,
      COLOR_FIELD_NAME
    );
  }

  private ShapeBorder resolveBorder(
    ReactViewBackgroundDrawable backgroundDrawable,
    float pixelDensity
  ) {
    long borderWidth = Utils.densityNormalized((long) backgroundDrawable.getFullBorderWidth(), pixelDensity);
    String borderColor = ColorUtils.formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL));

    return new ShapeBorder(
      borderColor,
      borderWidth
    );
  }

  public static class ShapeAndBorder {
    private final ShapeStyle shapeStyle;
    private final ShapeBorder border;

    public ShapeAndBorder(ShapeStyle shapeStyle, ShapeBorder border) {
      this.shapeStyle = shapeStyle;
      this.border = border;
    }

    public ShapeStyle getShapeStyle() {
      return shapeStyle;
    }

    public ShapeBorder getBorder() {
      return border;
    }
  }
}
