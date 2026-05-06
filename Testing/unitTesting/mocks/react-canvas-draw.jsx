import React from 'react';

const CanvasDrawMock = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    clear: () => {},
    undo: () => {},
    getSaveData: () => '{}',
    loadSaveData: () => {},
  }));

  return <div data-testid="canvas-draw" {...props}>Canvas Draw Mock</div>;
});

CanvasDrawMock.defaultProps = {
  onChange: null,
  loadTimeOffset: 5,
  lazyRadius: 30,
  brushRadius: 12,
  brushColor: "#444",
  catenaryColor: "#0a0302",
  gridColor: "rgba(189,189,189,0.1)",
  hideGrid: false,
  canvasWidth: 400,
  canvasHeight: 400,
  disabled: false,
  imgSrc: "",
  saveData: "",
  immediateLoading: false,
  hideInterface: false
};

export default CanvasDrawMock;
