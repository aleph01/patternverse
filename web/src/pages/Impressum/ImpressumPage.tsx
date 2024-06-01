import styled from "styled-components"
import { PageLayout } from "../../components/PageLayout"
import { Column } from "../../components/Column"

export const ImpressumPage = () => {

  return (
    <PageContainer>
      <PageLayout
        headerProps={{
          link:"/"
        }}
      >
        <ContentContainer>
          <Column mainaxisalignment="end" fullheight>
            <WhiteText>
              2024 // Made with love by <i>aleph</i>
            </WhiteText>
          </Column>
        </ContentContainer>
      </PageLayout>
    </PageContainer>

  )

}

const WhiteText = styled.p`
  color: #fff;
  font-family: Open Sans;
`

const PageContainer = styled.div`
  display: block;
  background: #000;
  height: 100vh;
  overflow: hidden;
`

const ContentContainer = styled.div`
  margin: 24px;
`