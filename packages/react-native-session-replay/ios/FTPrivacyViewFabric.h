/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#if RCT_NEW_ARCH_ENABLED
#import <React/RCTViewComponentView.h>
#import <react/renderer/components/FTSessionReplayReactNative/ComponentDescriptors.h>
#import <react/renderer/components/FTSessionReplayReactNative/EventEmitters.h>
#import <react/renderer/components/FTSessionReplayReactNative/Props.h>
#import <react/renderer/components/FTSessionReplayReactNative/RCTComponentViewHelpers.h>
#import <React/RCTFabricComponentsPlugins.h>
NS_ASSUME_NONNULL_BEGIN

@interface FTPrivacyViewFabric : RCTViewComponentView
@property (nonatomic, copy) NSString *nativeID;

@end

NS_ASSUME_NONNULL_END
#endif
