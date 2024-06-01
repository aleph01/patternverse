import { PVLogo } from "../../../assets"
import { Row } from "../../../components/Row"
import { HeaderContainer, InnerContainer, PVLogoContainer } from "./Header.styled"

export const Header = () => {
  return (
    <HeaderContainer>
      <PatternverseHeader />
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