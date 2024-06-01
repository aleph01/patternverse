import { Link, useParams } from "react-router-dom";
import { gql, useQuery } from "urql";
import { PVSpinner } from "../../components/PVSpinner";
import { Row } from "../../components/Row";
import styled from "styled-components";
import { PVLogo } from "../../assets";


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
    <PageContainer>
      <Header title={data.Collection.title} />
    </PageContainer>
  )

}

const PageContainer = styled.div`
`;


interface HeaderProps {
  title: string;
}

const Header = ({title}: HeaderProps) => {

  return (
    <HeaderContainer>
      <Row fullwidth>
        <Row childrenflex={false} spacing={60}>
          <Link to="/">
            <PVLogoContainer><PVLogo /></PVLogoContainer>
          </Link>
          <HeaderTextContainer>
            {title}
          </HeaderTextContainer>
        </Row>
      </Row>
    </HeaderContainer>
  )

}

const HeaderContainer = styled.div`
  position: sticky;
  top: 0;

  background: white;
  margin-bottom: 20px;
`

export const PVLogoContainer = styled.div`

  & svg {
    height: 42px;
    width: 42px;
    transform: translate(6px, 4px);

  }

  cursor: pointer;

`

const HeaderTextContainer = styled.h1`

`