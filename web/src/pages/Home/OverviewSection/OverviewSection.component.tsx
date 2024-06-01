import { Row } from "../../../components/Row"
import { CollectionsSection } from "./CollectionsSection/CollectionSection.component"
import { FeaturedSection } from "./FeaturedSection"
import { OverviewSectionContainer } from "./OverviewSection.styled"



export const OverviewSection = () => {

  return (
    <OverviewSectionContainer>
      <Row fullwidth childrenflex={false} spacing={300} mainaxisalignment="center" crossaxisalignment="start">
        <FeaturedSection />
        <CollectionsSection />
      </Row>
    </OverviewSectionContainer>
  )

}