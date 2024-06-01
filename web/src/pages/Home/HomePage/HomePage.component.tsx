import { Row } from "../../../components/Row"
import { HeaderText, StyledBoldText } from "../../../components/Typography"
import { PageLayout } from "../../../components/PageLayout";
import { Column } from "../../../components/Column"
import { TextWithUnderline } from "../../../components/Typography/TextWithUnderline"
import { PatternversePatternIllustration } from "../../../assets"
import { CollectionsSection } from "../OverviewSection/CollectionsSection/CollectionSection.component"
import { ContentContainer, ImageContainer } from "./HomePage.styled";

export const HomePage = () => {

  return (
    <PageLayout
      headerProps={{
        link: "/impressum"
      }}
    >
      <ContentContainer>
        <Row spacing={96} fullwidth>
          <About />
          <CollectionsSection />
        </Row>
      </ContentContainer>
    </PageLayout>
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
