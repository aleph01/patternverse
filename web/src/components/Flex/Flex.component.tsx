import { StyledFlex } from "./Flex.styled";
import { FlexProps } from "./Flex.types";

export const Flex = ({
  children,
  fullwidth = false,
  childrenflex = true,
  wrap = 'wrap',
  spacing = 24,
  inline,
  ...other
}: FlexProps) => {
  return (
    <StyledFlex
      fullwidth={fullwidth}
      childrenflex={childrenflex}
      wrap={wrap}
      spacing={spacing}
      inline={inline}
      {...other}
    >
      {children}
    </StyledFlex>
  );
};
