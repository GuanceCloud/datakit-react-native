/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay;

import com.ft.sdk.reactnative.sessionreplay.mappers.ReactEditTextMapper;
import com.ft.sdk.reactnative.sessionreplay.mappers.ReactNativeImageViewMapper;
import com.ft.sdk.reactnative.sessionreplay.mappers.ReactTextMapper;
import com.ft.sdk.reactnative.sessionreplay.mappers.ReactViewGroupMapper;
import com.ft.sdk.reactnative.sessionreplay.mappers.ReactViewModalMapper;
import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.facebook.react.views.image.ReactImageView;
import com.facebook.react.views.modal.ReactModalHostView;
import com.facebook.react.views.text.ReactTextView;
import com.facebook.react.views.textinput.ReactEditText;
import com.facebook.react.views.view.ReactViewGroup;
import com.ft.sdk.sessionreplay.ExtensionSupport;
import com.ft.sdk.sessionreplay.MapperTypeWrapper;
import com.ft.sdk.sessionreplay.recorder.OptionSelectorDetector;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ReactNativeSessionReplayExtensionSupport implements ExtensionSupport {
    private final TextViewUtils textViewUtils;

    public ReactNativeSessionReplayExtensionSupport(TextViewUtils textViewUtils) {
        this.textViewUtils = textViewUtils;
    }

    @Override
    public List<MapperTypeWrapper<?>> getCustomViewMappers() {
        return Arrays.asList(
                new MapperTypeWrapper<>(ReactImageView.class, new ReactNativeImageViewMapper()),
                new MapperTypeWrapper<>(ReactViewGroup.class, new ReactViewGroupMapper()),
                new MapperTypeWrapper<>(ReactTextView.class, new ReactTextMapper(textViewUtils)),
                new MapperTypeWrapper<>(ReactEditText.class, new ReactEditTextMapper(textViewUtils)),
                new MapperTypeWrapper<>(ReactModalHostView.class, new ReactViewModalMapper())
        );
    }

    @Override
    public List<OptionSelectorDetector> getOptionSelectorDetectors() {
        return new ArrayList<>();
    }

    @Override
    public List<DrawableToColorMapper> getCustomDrawableMapper() {
        return new ArrayList<>();
    }
}
