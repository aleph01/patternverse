import styled from "styled-components";
import { FlexProps } from "./Flex.types";

export const StyledFlex = styled.div<FlexProps>`
  display: ${({inline}) => inline ? 'inline-flex' : 'flex'};
  flex-direction: ${({ direction }) => direction};
  margin: 0;
  flex-wrap: ${({ wrap }) => wrap};
  ${({ fullwidth }) => fullwidth && 'width: 100%;'}
  ${({ fullheight }) => fullheight && 'height: 100%;'}

  ${({ spacing }) => spacing && `gap: ${spacing}px;`}

  ${({ mainaxisalignment, crossaxisalignment }) => {
    return `
      justify-content: ${mainaxisalignment ?? 'start'};
      align-items: ${crossaxisalignment ?? 'center'};
    `;
  }}

  > * {
    ${({ childrenflex }) => childrenflex && 'flex: 1;'}
  }
`;
