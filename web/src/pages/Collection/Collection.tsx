import { useParams } from "react-router-dom";
import { gql, useQuery } from "urql";
import { PVSpinner } from "../../components/PVSpinner";
import styled from "styled-components";
import { PageLayout } from "../../components/PageLayout";
import { Pattern } from "../../gql/graphql";
import { Column } from "../../components/Column";
import { ItemListing } from "../../components/ItemListing";


export const Collection = () => {

  const { id } = useParams();

  const CollectionQuery = gql`
    query {
      Collection(id: "${id!}") {
        _id
        title
        patterns {
          _id
          title
        }
      }
    }
  `;

  const [result] = useQuery({
    query: CollectionQuery,
  })

  const { data, fetching } = result;

  if (fetching) {
    return <PVSpinner />
  }

  return (
    <PageLayout headerProps={{
      link: "/",
      title: data.Collection.title!,
    }}>
      <ContentContainer>
        <Column>
          {data.Collection.patterns?.map((p: Pattern) =>
            <ItemListing
              id={p._id!}
              title={p.title!}

            />
          )}
        </Column>
      </ContentContainer>

    </PageLayout>
  )

}


export const ContentContainer = styled.div`
  margin: 24px;
  width: 90%;
`

export const PVLogoContainer = styled.div`

  & svg {
    height: 42px;
    width: 42px;
    transform: translate(6px, 4px);

  }

  cursor: pointer;

`