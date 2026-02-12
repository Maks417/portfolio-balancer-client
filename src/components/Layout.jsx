import React from 'react';
import { Container } from 'reactstrap';

const Layout = (props) => {
    return (
      <div>
        <Container>
          {props.children}
        </Container>
      </div>
    );
}

export default Layout;