import styled from "styled-components";
import { Row } from "../../components/Row";
import { useParams } from "react-router-dom";
import { gql, useQuery } from "urql";
import { PVSpinner } from "../../components/PVSpinner";
import { PortableText } from "@portabletext/react";
import {PortableTextBlock} from '@portabletext/types'
import urlBuilder from '@sanity/image-url';
import { sanityClient } from "../../graphql/client";
import { VideoURLPlayer } from "../../components/VideoURLPlayer";
import '@fortawesome/fontawesome-free/css/all.min.css';
import { PageLayout } from "../../components/PageLayout";


export const PageDetail = () => {

  const { id } = useParams();

  const PatternQuery = gql`
    query {
      Pattern(id: "${id!}") {
        _id
        title
        bodyRaw
      }
    }
  `

  const [result] = useQuery({
    query: PatternQuery
  })

  const { data, fetching } = result;

  if (fetching) {
    return <PVSpinner />
  }

  return (
    <PageLayout headerProps={{
      link: "/",
      title: data.Pattern.title,
    }}>
      <ArticleContainer>
        <Row crossaxisalignment="start" mainaxisalignment="start" childrenflex={false} inline={false} >
          <PageTextContainer>
            <PageText
              portableText={data.Pattern.bodyRaw}
            />
          </PageTextContainer>

        </Row>
      </ArticleContainer>

    </PageLayout>
  )
}

export const ArticleDetailsContainer = styled.div`
  max-width: 200px;
`

export const PVLogoContainer = styled.div`

  & svg {
    height: 42px;
    width: 42px;
    transform: translate(6px, 4px);

  }

  cursor: pointer;

`

interface PageTextProps {
  portableText: PortableTextBlock;
}

export const PageText = ({
  portableText
}: PageTextProps) => {

  return (
    <>
      <PortableText
        value={portableText}
        onMissingComponent={(v) => {
          console.log(v)
        }}
        components={{
          types: {
            image: ({value, isInline}) => {
              const imageUrl = urlBuilder(sanityClient).image(value).width(isInline ? 100 : 800).fit('max').auto('format').url();
              return (
                <img src={imageUrl} />
              )
            },
            youtube: (props) => {
              console.log(props);

              return <VideoURLPlayer title={props.value.url} />
            }
          },
          block: {
            blockquote: ({children}) => <BlockQuoteContainer>{children}</BlockQuoteContainer>,
          },
        }}
      />
     </>
  )
}

const ArticleContainer = styled.div`

  margin-left: 118px;


`

// TODO: redefine responsiveness
const PageTextContainer = styled.div`

  max-width: 90%;
  margin: auto 0;

  @media (min-width: 1000px) {
    max-width: 800px;
  }

`

const BlockQuoteContainer = styled.div`
  &::before {
    content: "\\f10d"; /* FontAwesome Unicode for quote-left */
    font-family: "Font Awesome 5 Free"; /* Use the correct font family */
    font-weight: 900; /* FontAwesome uses font-weight to differentiate between solid and regular icons */
    margin-right: 10px;
    font-size: 1.5em;
    color: var(--textBlack);
  }
`

// const ExpandContractButton = styled.div`
//   background: var(--appYellow);
//   width: 34px;
//   height: 34px;
//   border-radius: 5px;
//   cursor: pointer;

//   & svg {
//     width: 100%;
//     height: 100%;
//     scale: 0.6;
//   }
// `