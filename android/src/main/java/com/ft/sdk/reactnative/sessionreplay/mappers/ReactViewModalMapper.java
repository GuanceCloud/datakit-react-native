/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.mappers;

import com.ft.sdk.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.DrawableUtils;
import com.facebook.react.views.modal.ReactModalHostView;

public class ReactViewModalMapper extends DefaultMapper<ReactModalHostView> {
    public ReactViewModalMapper() {
        this(new ReactViewBackgroundDrawableUtils());
    }

    public ReactViewModalMapper(DrawableUtils drawableUtils) {
        super(drawableUtils);
    }
}
