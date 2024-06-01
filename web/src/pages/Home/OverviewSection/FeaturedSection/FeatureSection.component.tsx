import { gql, useQuery } from "urql"
import { Column } from "../../../../components/Column"
import { ItemListing } from "../../../../components/ItemListing"
import { HeaderText } from "../../../../components/Typography"
import { TextWithUnderline } from "../../../../components/Typography/TextWithUnderline/TextWithUnderline.component"
import { PVSpinner } from "../../../../components/PVSpinner"
import { Pattern } from "../../../../gql/graphql"

const PatternsQuery = gql`
  query {
    allPattern(limit: 5) {
      _id
      title
    }
  }
`;

export const FeaturedSection = () => {

  const [result] = useQuery({
    query: PatternsQuery
  })

  const { data, fetching } = result;

  return (
    <Column crossaxisalignment="start">
      <TextWithUnderline color="var(--appPurple)">
        <HeaderText>Featured</HeaderText>
      </TextWithUnderline>

      {fetching || data === undefined
        ? <PVSpinner />
        : <Column crossaxisalignment="start" spacing={12}>
            {
              data.allPattern.map((s: Pattern) =>
                <ItemListing id={s._id!} title={s.title!} />
              )
            }
          </Column>
      }

    </Column>
  )

}
