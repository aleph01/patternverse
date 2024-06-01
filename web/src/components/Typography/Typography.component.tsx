import styled from "styled-components";
import { TextProps } from "./Typography.types";

const Base = styled.p`
  line-height: 1;
  letter-spacing: 0.5px;
  margin: 0px;
`;

export const HeaderText = ({ size = 40, color = "#000", fontFamily, children}: TextProps) => {

  return (
    <StyledNormalText size={size} color={color} fontFamily={fontFamily}>
      {children}
    </StyledNormalText>
  )

}

export const ListingText = ({size = 24, color = "var(--textBlack)", children}: TextProps) => {

  return <StyledBoldText fontFamily={"Open Sans"} size={size} color={color}>{children}</StyledBoldText>

}

export const ListingSubText = ({size = 15, color = "var(--textBlack)", children}: TextProps) => {

  return (
    <StyledNormalText
      size={size}
      color={color}
      fontFamily="Open Sans">{children}
    </StyledNormalText>
  )


}

export const StyledNormalText = styled(Base)<TextProps>`
  font-weight: normal;
  font-size: ${(props) => props.size}px;
  color: ${(props) => props.color};
  font-family: ${(props) => props.fontFamily};
`;

export const StyledBoldText = styled(Base)<TextProps>`
  font-weight: 600;
  font-size: ${(props) => props.size}px;
  color: ${(props) => props.color};
  font-family: ${(props) => props.fontFamily};
`