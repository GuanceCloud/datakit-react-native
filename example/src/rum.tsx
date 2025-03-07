import * as React from 'react';
import { Text, View, SectionList, Pressable } from 'react-native';
import { FTReactNativeRUM, FTRUMResource } from '@cloudcare/react-native-mobile';
import { Utils, styles } from './utils';
enum ActionCustomType {
      actionName,
      enableTrack,
      extraProperty,
}

class RUMScreen extends React.Component {
      static options() {
            return {
                  topBar: {
                        title: {
                              text: "RUM 数据采集"
                        }
                  }
            };
      }
      generateError = () => {
            var test;
            test.color; //This will generate a TypeError: undefined
      }
      _sectionComp = (info: any) => {
            var txt = " " + info.section.title;
            return <Text
                  style={{ height: 20, textAlign: 'left', backgroundColor: '#6f7178', color: 'white', fontSize: 15 }}>{txt}</Text>
      }

      _renderItem = (info: any) => {
            var key = info.section.key
            if (key === "C") {
                  var type = info.item.custom
                  switch (type) {
                        case ActionCustomType.actionName:
                              // 自定义某一控件点击事件的 `actionName`
                              return <View style={styles.list}>
                                    <Pressable
                                          accessibilityLabel='custom_action_name'
                                          onPress={info.item.onPress}
                                    >
                                          {({ pressed }) => (
                                                <Text
                                                      style={{ fontSize: 18, color: pressed ? 'gray' : '#007AFFFF' }}>{info.item.title}</Text>
                                          )}
                                    </Pressable></View>
                        case ActionCustomType.enableTrack:
                              // 设置不采集某一控件的点击事件
                              return <View style={styles.list}>
                                    <Pressable
                                          ft-enable-track="false"
                                          onPress={info.item.onPress}
                                    >
                                          {({ pressed }) => (
                                                <Text
                                                      style={{ fontSize: 18, color: pressed ? 'gray' : '#007AFFFF' }}>{info.item.title}</Text>
                                          )}
                                    </Pressable></View>
                        case ActionCustomType.extraProperty:
                              // 对某一控件的点击事件添加额外属性
                              return <View style={styles.list}>
                                    <Pressable
                                          ft-extra-property='{"e_name": "John Doe", "e_age": 30, "e_city": "New York"}'
                                          onPress={
                                                info.item.onPress}>
                                          {({ pressed }) => (
                                                <Text
                                                      style={{ fontSize: 18, color: pressed ? 'gray' : '#007AFFFF' }}>{info.item.title}</Text>
                                          )}
                                    </Pressable></View>
                        default:
                              return <View></View>
                  }
            } else {
                  return <View style={styles.list}>
                        <Pressable onPress={info.item.onPress}>
                              {({ pressed }) => (
                                    <Text
                                          style={{ fontSize: 18, color: pressed ? 'gray' : '#007AFFFF' }}>{info.item.title}</Text>
                              )}
                        </Pressable></View>
            }
      }

      render() {
            var sections = [
                  {
                        key: "A",
                        title: "未开启自动采集时，可以通过 api 手动采集",
                        data: [
                              {
                                    title: "Start Action",
                                    onPress: () => {
                                          console.log('Action 点击');
                                          FTReactNativeRUM.startAction('start_actionName', 'actionType');
                                    }
                              }, 
                              {
                                    title: "Add Action",
                                    onPress: () => {
                                          console.log('Action 点击');
                                          FTReactNativeRUM.addAction('add_actionName', 'actionType');
                                    }
                              },
                              {
                                    title: "View: onCreateView",
                                    onPress: () => {
                                          FTReactNativeRUM.onCreateView("RUM", 100000000);
                                    }
                              }, {
                                    title: "View: startView",
                                    onPress: () => {
                                          FTReactNativeRUM.startView("RUM", { "startView_property": "rn_demo" });
                                    }
                              }, {
                                    title: "View: stopView",
                                    onPress: () => {
                                          FTReactNativeRUM.stopView({ "stopView_property": "rn_demo" });
                                    }
                              }, {
                                    title: "Resource Normal",
                                    onPress: () => {
                                          this.getHttp("https://www.baidu.com");
                                    }
                              }, {
                                    title: "Resource Error",
                                    onPress: () => {
                                          this.getHttp("https://console-api.guance.com/not/found/");
                                    }
                              }, {
                                    title: "Add Error",
                                    onPress: () => {
                                          FTReactNativeRUM.addError("error stack", "error message", { "error_property": "rn_demo" });
                                    }
                              },
                              {
                                    title: "Add Error With Type",
                                    onPress: () => {
                                          FTReactNativeRUM.addErrorWithType("custom_error", "error stack", "error message");
                                    }
                              }
                        ]
                  },
                  {
                        key: "B",
                        title: "开启 React-Native Error 自动采集 ，Error 示例",
                        data: [
                              {
                                    title: "Generate an Error",
                                    onPress: () => {
                                          this.generateError()
                                    }
                              }, {
                                    title: "Generate a Console Error",
                                    onPress: () => {
                                          console.error("Add Console Error");
                                    }
                              }
                        ]
                  },
                  {
                        key: "C",
                        title: "开启 React-Native Action 自动采集，添加一些自定义操作",
                        data: [{
                              title: "自定义某一控件点击事件的 `actionName`",
                              custom: ActionCustomType.actionName,
                              onPress: () => {
                                    console.log('Action 点击');
                              }
                        }, {
                              title: "不采集某一控件的点击事件",
                              custom: ActionCustomType.enableTrack,
                              onPress: () => {
                                    console.log('Action 点击');
                              }
                        }, {
                              title: "对某一控件的点击事件添加额外属性",
                              custom: ActionCustomType.extraProperty,
                              onPress: () => {
                                    console.log('Action 点击');
                              }
                        }]
                  },

            ];
            return (
                  <View style={{ flex: 1 }}>
                        <SectionList
                              renderSectionHeader={this._sectionComp}
                              renderItem={this._renderItem}
                              sections={sections}
                        />
                  </View>
            );
      }



      async getHttp(url: string) {
            const key = Utils.getUUID();
            FTReactNativeRUM.startResource(key, { "startResource_property_demo": "rn_demo" });
            const fetchOptions = {
                  method: 'GET',
                  headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                  },
            };
            var res: Response | undefined;
            try {
                  res = await fetch(url, fetchOptions);
            } finally {
                  var resource: FTRUMResource = {
                        url: url,
                        httpMethod: fetchOptions.method,
                        requestHeader: fetchOptions.headers,
                  };
                  if (res) {
                        var header: { [k: string]: any } = {};
                        res.headers.forEach((value: any, name: any) => {
                              header[name] = value
                        });
                        resource.responseHeader = header;
                        resource.resourceStatus = res.status;
                        resource.responseBody = await res.text();
                  }
                  FTReactNativeRUM.stopResource(key, { "endResource_property_demo": "rn_demo" });
                  FTReactNativeRUM.addResource(key, resource);
            }
      }
}
export default RUMScreen;
