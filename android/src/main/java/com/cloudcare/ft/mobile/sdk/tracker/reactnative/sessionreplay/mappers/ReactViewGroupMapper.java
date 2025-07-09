/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.DrawableUtils;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;
import com.facebook.react.views.view.ReactViewGroup;
import com.ft.sdk.sessionreplay.model.ShapeWireframe;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.recorder.mapper.BaseWireframeMapper;
import com.ft.sdk.sessionreplay.recorder.mapper.TraverseAllChildrenMapper;
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback;
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter;
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver;
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory;
import com.ft.sdk.sessionreplay.utils.GlobalBounds;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.Collections;
import java.util.List;

public class ReactViewGroupMapper extends BaseWireframeMapper<ReactViewGroup> implements TraverseAllChildrenMapper<ReactViewGroup> {
  private final ReactViewBackgroundDrawableUtils reactViewBackgroundDrawableUtils;
  private final DrawableUtils drawableUtils;

  public ReactViewGroupMapper() {
    this(new ReactViewBackgroundDrawableUtils(), new DrawableUtils());
  }

  public ReactViewGroupMapper(ReactViewBackgroundDrawableUtils reactViewBackgroundDrawableUtils, DrawableUtils drawableUtils) {
    super(
      DefaultViewIdentifierResolver.get(),
      DefaultColorStringFormatter.get(),
      DefaultViewBoundsResolver.get(),
      DrawableToColorMapperFactory.getDefault()
    );
    this.reactViewBackgroundDrawableUtils = reactViewBackgroundDrawableUtils;
    this.drawableUtils = drawableUtils;
  }

  @Override
  public List<Wireframe> map(ReactViewGroup view, MappingContext mappingContext, AsyncJobStatusCallback asyncJobStatusCallback, InternalLogger internalLogger) {
    float pixelDensity = mappingContext.getSystemInformation().getScreenDensity();
    GlobalBounds viewGlobalBounds =
      DefaultViewBoundsResolver.get().resolveViewGlobalBounds(view, pixelDensity);
    ReactViewBackgroundDrawable backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.getBackground());

    float opacity = view.getAlpha();

    ReactViewBackgroundDrawableUtils.ShapeAndBorder shapeAndBorder = null;
    if (backgroundDrawable != null) {
      shapeAndBorder = reactViewBackgroundDrawableUtils.resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity);
    }

    ShapeWireframe shapeWireframe = new ShapeWireframe(
      resolveViewId(view),
      viewGlobalBounds.getX(),
      viewGlobalBounds.getY(),
      viewGlobalBounds.getWidth(),
      viewGlobalBounds.getHeight(),
      null,
      shapeAndBorder != null ? shapeAndBorder.getShapeStyle() : null,
      shapeAndBorder != null ? shapeAndBorder.getBorder() : null
    );
    return Collections.singletonList(shapeWireframe);
  }
}
