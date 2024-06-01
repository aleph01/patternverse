import { ReactNode } from "react";
import styled from "styled-components"

interface TextWithUnderlineProps {
  children: ReactNode;
  color: string;
}

export const TextWithUnderline = ({children, color}: TextWithUnderlineProps) =>
  <ColoredUnderline>
    {children}
    <Underline color={color} />
  </ColoredUnderline>

const ColoredUnderline = styled.span`
  position: relative;
  display: inline-block;
  padding-bottom: 10px;
  margin-right: 5px;
`;

const Underline = styled.span`
  position: absolute;
  bottom: 0;
  width: 90%;
  height: 5px;
  background-color: ${({ color }) => color};
`;