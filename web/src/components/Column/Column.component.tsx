import { Flex } from "../Flex";
import { FlexProps } from "../Flex/Flex.types";

export interface ColumnProps extends Omit<FlexProps, 'direction'> {

}

export const Column = ({inline = true, ...props}: ColumnProps) =>
  <Flex direction="column" inline={inline} {...props} />