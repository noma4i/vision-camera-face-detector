import React, { memo, useCallback } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { COLORS } from '../theme';

export interface OverlayButtonProps extends Omit<PressableProps, 'style'> {
  buttonStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const OverlayButton: React.FC<OverlayButtonProps> = ({ buttonStyle, children, ...rest }) => {
  const style = useCallback(
    ({ pressed }: { pressed: boolean }) => [styles.button, buttonStyle, pressed && styles.pressed],
    [buttonStyle]
  );

  return (
    <Pressable {...rest} style={style}>
      <View>{children}</View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: {
    opacity: 0.7
  }
});

export default memo(OverlayButton);
