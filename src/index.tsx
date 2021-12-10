import { NativeModules } from 'react-native';

type FtMobileAgentType = {
  multiply(a: number, b: number): Promise<number>;
};

const { FtMobileAgent } = NativeModules;

export default FtMobileAgent as FtMobileAgentType;
