import React from 'react';
import { Container, Row, Col } from 'reactstrap';
import BalanceForm from './BalanceForm';

const Home = () => {
  return (
    <Container className="calculator-page">
      <Row className="w-100 justify-content-center">
        <Col xs="12">
          <BalanceForm />
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
