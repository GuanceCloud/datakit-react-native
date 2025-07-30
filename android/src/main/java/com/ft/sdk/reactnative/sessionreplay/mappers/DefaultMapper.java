/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.mappers;

import android.graphics.drawable.Drawable;
import android.view.View;

import com.ft.sdk.reactnative.sessionreplay.utils.DrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;
import com.ft.sdk.sessionreplay.model.ShapeWireframe;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.recorder.mapper.BaseWireframeMapper;
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback;
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter;
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver;
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory;
import com.ft.sdk.sessionreplay.utils.GlobalBounds;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.Collections;
import java.util.List;

public class DefaultMapper<T extends View> extends BaseWireframeMapper<T> {
  private final DrawableUtils drawableUtils;

  public DefaultMapper(DrawableUtils drawableUtils) {
    super(
      DefaultViewIdentifierResolver.get(),
      DefaultColorStringFormatter.get(),
      DefaultViewBoundsResolver.get(),
      DrawableToColorMapperFactory.getDefault()
    );
    this.drawableUtils = drawableUtils;
  }

  @Override
  public List<Wireframe> map(
    T view,
    MappingContext mappingContext,
    AsyncJobStatusCallback asyncJobStatusCallback,
    InternalLogger internalLogger
  ) {
    float pixelDensity = mappingContext.getSystemInformation().getScreenDensity();
    GlobalBounds viewGlobalBounds =
      DefaultViewBoundsResolver.get().resolveViewGlobalBounds(view, pixelDensity);
    Drawable backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.getBackground());

    float opacity = view.getAlpha();

    Pair<ShapeStyle, ShapeBorder> shapeAndBorder =
      backgroundDrawable != null ?
        drawableUtils.resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)
        : new Pair<>(null, null);

    ShapeStyle shapeStyle = shapeAndBorder.first;
    ShapeBorder border = shapeAndBorder.second;

    ShapeWireframe shapeWireframe = new ShapeWireframe(
      resolveViewId(view),
      viewGlobalBounds.getX(),
      viewGlobalBounds.getY(),
      viewGlobalBounds.getWidth(),
      viewGlobalBounds.getHeight(),
      null,
      shapeStyle,
      border
    );
    return Collections.singletonList(shapeWireframe);
  }
}
