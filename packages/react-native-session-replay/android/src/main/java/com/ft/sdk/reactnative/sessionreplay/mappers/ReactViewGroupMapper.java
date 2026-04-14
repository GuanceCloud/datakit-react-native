/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.mappers;

import com.ft.sdk.reactnative.sessionreplay.utils.DrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.facebook.react.views.view.ReactViewGroup;
import com.ft.sdk.sessionreplay.recorder.mapper.TraverseAllChildrenMapper;

public class ReactViewGroupMapper extends DefaultMapper<ReactViewGroup> implements TraverseAllChildrenMapper<ReactViewGroup> {
    public ReactViewGroupMapper() {
        this(new ReactViewBackgroundDrawableUtils());
    }

    public ReactViewGroupMapper(DrawableUtils drawableUtils) {
        super(drawableUtils);
    }
}
