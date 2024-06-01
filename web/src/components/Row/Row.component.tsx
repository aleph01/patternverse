import { Flex } from "../Flex";
import { FlexProps } from "../Flex/Flex.types";

export interface RowProps extends Omit<FlexProps, 'direction'> {

}

export const Row = ({inline = true, ...props}: RowProps) =>
  <Flex direction="row" inline={inline} {...props} />