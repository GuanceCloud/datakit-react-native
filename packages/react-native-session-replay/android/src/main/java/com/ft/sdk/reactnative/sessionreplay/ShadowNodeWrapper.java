/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.ft.sdk.reactnative.sessionreplay;

import androidx.annotation.VisibleForTesting;
import com.ft.sdk.reactnative.sessionreplay.utils.ReflectionUtils;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.ReactShadowNode;
import com.facebook.react.uimanager.UIImplementation;
import com.facebook.react.uimanager.UIManagerModule;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class ShadowNodeWrapper {
    private final ReactShadowNode<?> shadowNode;
    private final ReflectionUtils reflectionUtils;

    public static final String UI_IMPLEMENTATION_FIELD_NAME = "mUIImplementation";

    public ShadowNodeWrapper(ReactShadowNode<?> shadowNode, ReflectionUtils reflectionUtils) {
        this.shadowNode = shadowNode;
        this.reflectionUtils = reflectionUtils;
    }

    public Object getDeclaredShadowNodeField(String fieldName) {
        if (shadowNode != null) {
            return reflectionUtils.getDeclaredField(shadowNode, fieldName);
        }
        return null;
    }

    public static ShadowNodeWrapper getShadowNodeWrapper(
            ReactContext reactContext,
            UIManagerModule uiManagerModule,
            ReflectionUtils reflectionUtils,
            int viewId
    ) {
        if (reactContext == null) {
            return null;
        }

        CountDownLatch countDownLatch = new CountDownLatch(1);
        final ReactShadowNode<?>[] target = new ReactShadowNode[1];

        Runnable shadowNodeRunnable = new Runnable() {
            @Override
            public void run() {
                ReactShadowNode<?> node = resolveShadowNode(reflectionUtils, uiManagerModule, viewId);
                if (node != null) {
                    target[0] = node;
                }
                countDownLatch.countDown();
            }
        };

        reactContext.runOnNativeModulesQueueThread(shadowNodeRunnable);
        try {
            countDownLatch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        if (target[0] == null) {
            return null;
        }

        return new ShadowNodeWrapper(target[0], reflectionUtils);
    }

    private static ReactShadowNode<?> resolveShadowNode(ReflectionUtils reflectionUtils, UIManagerModule uiManagerModule, int tag) {
        if (uiManagerModule == null ) {
            return null;
        }
        UIImplementation uiManagerImplementation = (UIImplementation) reflectionUtils.getDeclaredField(uiManagerModule, UI_IMPLEMENTATION_FIELD_NAME);
        return uiManagerImplementation != null ? uiManagerImplementation.resolveShadowNode(tag) : null;
    }
}
