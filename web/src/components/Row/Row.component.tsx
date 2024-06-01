import { Flex } from "../Flex";
import { FlexProps } from "../Flex/Flex.types";

export interface RowProps extends Omit<FlexProps, 'direction'> {

}

export const Row = ({inline = true, crossaxisalignment="start", ...props}: RowProps) =>
  <Flex direction="row" crossaxisalignment={crossaxisalignment} inline={inline} {...props} />