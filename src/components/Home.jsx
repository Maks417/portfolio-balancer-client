import React from 'react';
import { Container, Row, Col } from 'reactstrap';
import BalanceForm from './BalanceForm';

const Home = () => {
  return (
    <Container style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Row style={{ width: '100%' }}>
        <Col className='row justify-content-md-center'>
          <BalanceForm />
        </Col>
      </Row>
    </Container>
  );
}

export default Home;