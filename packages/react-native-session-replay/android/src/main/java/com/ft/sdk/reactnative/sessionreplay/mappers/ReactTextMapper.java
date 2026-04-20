/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.mappers;

import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.facebook.react.views.text.ReactTextView;
import com.ft.sdk.sessionreplay.model.ImageWireframe;
import com.ft.sdk.sessionreplay.model.PlaceholderWireframe;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.recorder.mapper.TextViewMapper;
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback;
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter;
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver;
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.ArrayList;
import java.util.List;

public class ReactTextMapper extends TextViewMapper<ReactTextView> {
  private final TextViewUtils textViewUtils;

  public ReactTextMapper(TextViewUtils textViewUtils) {
    super(
      DefaultViewIdentifierResolver.get(),
      DefaultColorStringFormatter.get(),
      DefaultViewBoundsResolver.get(),
      DrawableToColorMapperFactory.getDefault()
    );
    this.textViewUtils = textViewUtils;
  }


  @Override
  public List<Wireframe> map(ReactTextView view, MappingContext mappingContext, AsyncJobStatusCallback asyncJobStatusCallback, InternalLogger internalLogger) {
    List<Wireframe> wireframes = super.map(view, mappingContext, asyncJobStatusCallback, internalLogger);
    List<Wireframe> mappedWireframes = textViewUtils.mapTextViewToWireframes(
      wireframes,
      view,
      mappingContext
    );
    List<Wireframe> result = new ArrayList<>();
    for (Wireframe wf : mappedWireframes) {
      if (!(wf instanceof ImageWireframe) &&
        !(wf instanceof PlaceholderWireframe)) {
        result.add(wf);
      }
    }
    return result;
  }
}
