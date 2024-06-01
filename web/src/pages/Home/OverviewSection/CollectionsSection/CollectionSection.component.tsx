import { gql, useQuery } from "urql";
import { Column } from "../../../../components/Column";
import { TextWithUnderline } from "../../../../components/Typography/TextWithUnderline/TextWithUnderline.component";
import { HeaderText } from "../../../../components/Typography";
import { CollectionListing } from "../../../../components/CollectionListing";
import { PVSpinner } from "../../../../components/PVSpinner";
import { Collection } from "../../../../gql/graphql";

const CollectionsQuery = gql`
  query {
    allCollection(limit:3) {
      _id
      title
      color
    }
  }
`

export const CollectionsSection = () => {

  const [result] = useQuery({
    query: CollectionsQuery
  })

  const { data, fetching } = result;

  return (
    <Column crossaxisalignment="start">
       <TextWithUnderline color="var(--appRed)">
        <HeaderText>Collections</HeaderText>
      </TextWithUnderline>

      {fetching || data === undefined
        ? <PVSpinner />
        : <Column crossaxisalignment="start" spacing={12}>
            {
              data.allCollection.map((c: Collection) =>
                <CollectionListing
                  id={c._id!}
                  title={c.title!}
                  color={c.color!}
                />
              )
            }
          </Column>
      }

    </Column>


  )

}