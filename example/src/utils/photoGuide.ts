import { Dimensions } from 'react-native';
import type { PhotoGuideLayout } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PHOTO_GUIDE_LAYOUT_RATIOS = {
  FRAME_SIZE: 0.83,
  FRAME_TOP: 0.224,
  OUTER_FRAME_TOP: 0,
  OUTER_FRAME_HEIGHT: 0.82
} as const;

const PHOTO_GUIDE_DIMENSIONS = {
  FRAME_PADDING_OFFSET: 40,
  FRAME_POSITION_OFFSET: -20
} as const;

export const getPhotoGuideLayout = (
  screenWidth: number = SCREEN_WIDTH,
  screenHeight: number = SCREEN_HEIGHT
): PhotoGuideLayout => {
  const frameSize = screenWidth * PHOTO_GUIDE_LAYOUT_RATIOS.FRAME_SIZE;

  return {
    frameSize,
    frameRadius: frameSize * 0.5,
    frameLeft: (screenWidth - frameSize) / 2,
    frameTop: screenHeight * PHOTO_GUIDE_LAYOUT_RATIOS.FRAME_TOP,
    outerFrameTop: screenHeight * PHOTO_GUIDE_LAYOUT_RATIOS.OUTER_FRAME_TOP,
    outerFrameHeight: screenHeight * PHOTO_GUIDE_LAYOUT_RATIOS.OUTER_FRAME_HEIGHT,
    centerSquareFrameSize: frameSize + PHOTO_GUIDE_DIMENSIONS.FRAME_PADDING_OFFSET,
    centerSquareFrameLeft:
      (screenWidth - frameSize) / 2 + PHOTO_GUIDE_DIMENSIONS.FRAME_POSITION_OFFSET,
    centerSquareFrameTop:
      screenHeight * PHOTO_GUIDE_LAYOUT_RATIOS.FRAME_TOP +
      PHOTO_GUIDE_DIMENSIONS.FRAME_POSITION_OFFSET
  };
};

export const SCREEN_DIMENSIONS = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT
};
