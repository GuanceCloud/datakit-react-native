/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.DrawableUtils
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils
import com.facebook.react.views.view.ReactViewGroup
import com.ft.sdk.sessionreplay.model.ShapeWireframe
import com.ft.sdk.sessionreplay.model.Wireframe
import com.ft.sdk.sessionreplay.recorder.MappingContext
import com.ft.sdk.sessionreplay.recorder.mapper.BaseWireframeMapper
import com.ft.sdk.sessionreplay.recorder.mapper.TraverseAllChildrenMapper
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory
import com.ft.sdk.sessionreplay.utils.InternalLogger

internal class ReactViewGroupMapper(
  private val reactViewBackgroundDrawableUtils: ReactViewBackgroundDrawableUtils =
    ReactViewBackgroundDrawableUtils(),
  private val drawableUtils: DrawableUtils = DrawableUtils()
) :
  BaseWireframeMapper<ReactViewGroup>(
    DefaultViewIdentifierResolver.get(),
    DefaultColorStringFormatter.get(),
    DefaultViewBoundsResolver.get(),
    DrawableToColorMapperFactory.getDefault()
  ),
  TraverseAllChildrenMapper<ReactViewGroup> {

  override fun map(
    view: ReactViewGroup,
    mappingContext: MappingContext,
    asyncJobStatusCallback: AsyncJobStatusCallback,
    internalLogger: InternalLogger
  ): List<Wireframe> {
    val pixelDensity = mappingContext.systemInformation.screenDensity
    val viewGlobalBounds =
      DefaultViewBoundsResolver.get().resolveViewGlobalBounds(view, pixelDensity)
    val backgroundDrawable = drawableUtils.getReactBackgroundFromDrawable(view.background)

    // view.alpha is the value of the opacity prop on the js side
    val opacity = view.alpha

    val (shapeStyle, border) =
      if (backgroundDrawable != null) {
        reactViewBackgroundDrawableUtils
          .resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)
      } else {
        null to null
      }

    return listOf(
      ShapeWireframe(
        resolveViewId(view),
        viewGlobalBounds.x,
        viewGlobalBounds.y,
        viewGlobalBounds.width,
        viewGlobalBounds.height,
        null,
        shapeStyle,
        border
      )
    )
  }
}
