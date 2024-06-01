import styled from "styled-components"
import { Row } from "../../../components/Row"
import { HeaderText, StyledBoldText } from "../../../components/Typography"
import { Header } from "../Header/Header.component"
import { Column } from "../../../components/Column"
import { TextWithUnderline } from "../../../components/Typography/TextWithUnderline"
import { PatternversePatternIllustration } from "../../../assets"

export const HomePage = () => {

  return (
    <>
      <Header />
      <AboutContainer>
        <About />
      </AboutContainer>

    </>

  )
}

const About = () => {

  return (
    <Column crossaxisalignment="start">
      <TextWithUnderline color="var(--appGreen)">
        <HeaderText>About</HeaderText>
      </TextWithUnderline>
      <Row crossaxisalignment="start">
        <ImageContainer>
          <img src={PatternversePatternIllustration} />
        </ImageContainer>
        <StyledBoldText>
          <b>the patternverse.</b>
          <br/>
          <br />
          a universe <br/>
          of patterns <br/>
          to make <br/>
          greater minds.
          <br/>
          <br/>
          <br/>
          <i>coming soon.</i>
        </StyledBoldText>
      </Row>
    </Column>
  )

}

const ImageContainer = styled.div`
  img {
    width: 200px;
  }
`

const AboutContainer = styled.div`
  display: flex;
  position: fixed;
  align-items: center;
  justify-content: center;
  margin: 24px;
`