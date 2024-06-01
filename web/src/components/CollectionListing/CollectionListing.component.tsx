import styled, { css } from "styled-components";
import { Row } from "../Row";
import { ListingText } from "../Typography";
import { useState } from "react";
import { Link } from "react-router-dom";

interface CollectionListingProps {
  id: string|number;
  title: string;
  color: string;
}

export const CollectionListing = ({id, title, color}: CollectionListingProps) => {

  const [hover, setHover] = useState(false);

  return (
    <Link to={`/collections/${id}`}>
      <CollectionListingContainer hover={hover} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Row childrenflex={false} crossaxisalignment="center">
        <CollectionBlockColor color={color} />
        <ListingText>{title}</ListingText>
      </Row>
      </CollectionListingContainer>
    </Link>

  )
}

interface CollectionBlockColorProps {
  color: string;
}

const CollectionBlockColor = styled.div<CollectionBlockColorProps>`
  height: 20px;
  width: 20px;

  background: ${(props) => props.color}
`

interface CollectionListingContainerProps {
  hover: boolean;
}

const CollectionListingContainer = styled.div<CollectionListingContainerProps>`
  padding-top: 12px;
  padding-bottom: 12px;

  width: 300px;

  ${(props) => props.hover &&
    css`
      background: black;

      & p {
        color: white;
      }

      cursor: pointer;

      & p, div {
        transform: translateX(12px);
      }

      padding-right: 24px;

      border-radius: 5px;

    `
  }
`