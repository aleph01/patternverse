import { Link } from "react-router-dom"
import { PVLogo } from "../../assets"
import { Row } from "../Row"
import { HeaderContainer, InnerContainer, PVLogoContainer } from "./Header.styled"
import { HeaderText } from "../Typography";

export interface HeaderProps {
  link?: string;
  title?: string;
}

export const Header = ({
  link,
  title
}: HeaderProps) => {

  return (
    <HeaderContainer>
      {link
        ? <Link to={link}>
           <PatternverseHeader />
        </Link>
        : <PatternverseHeader />
      }

      {title && <HeaderText fontFamily="Open Sans">{title}</HeaderText>}
    </HeaderContainer>

  )
}

const PatternverseHeader = () => {

  return (
    <InnerContainer>
      <Row childrenflex={false}>
        <PVLogoContainer><PVLogo /></PVLogoContainer>
      </Row>
    </InnerContainer>
  )

}