import React, { useState, useEffect } from 'react';
import { Badge, Popover, OverlayTrigger, Button, ListGroup, Modal } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faChevronDown, faChevronUp, faTimes } from '@fortawesome/free-solid-svg-icons';
import api,{ BASE_URL } from "../../services/service";
import { useAuth } from "../../../context/AuthContext";
const MissingDocumentsAlert = () => {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedComponent, setExpandedComponent] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(null);

  useEffect(() => {
    const fetchMissingDocuments = async () => {
      try {
        const response = await api.get('api/raw_material/api/masterlist/missing_documents_report/');
        setReport(response.data.report);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMissingDocuments();

    // Refresh every 5 minutes
    const interval = setInterval(fetchMissingDocuments, 300000);
    return () => clearInterval(interval);
  }, []);

  const totalMissing = report.reduce((sum, item) => sum + item.missing_count, 0);

  const handleExpand = (componentId) => {
    setExpandedComponent(expandedComponent === componentId ? null : componentId);
  };

  const NotificationsPopover = (
    <Popover id="notifications-popover" style={{ maxWidth: '500px', width: '500px',background: "white",
    border: "1px solid #ddd" }}>
      <Popover.Header as="div" className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Missing Documents</h5>
        <div className="d-flex align-items-center">
          <Badge bg="danger" pill className="me-2">
            {totalMissing} missing
          </Badge>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 text-dark"
            onClick={() => setShowNotifications(false)}
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>
      </Popover.Header>
      <Popover.Body className="p-0">
        {loading ? (
          <div className="p-3 text-center">Loading notifications...</div>
        ) : error ? (
          <div className="p-3 text-center text-danger">Error loading notifications</div>
        ) : report.length === 0 ? (
          <div className="p-3 text-center text-success">All documents are complete!</div>
        ) : (
          <ListGroup variant="flush" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {report.map((item) => (
              <React.Fragment key={item.component_id}>
                <ListGroup.Item 
                  action 
                  onClick={() => handleExpand(item.component_id)}
                  className="d-flex justify-content-between align-items-center py-2"
                >
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <Badge bg="danger" pill>{item.missing_count}</Badge>
                    </div>
                    <div>
                      <div className="fw-bold">{item.component_name}</div>
                      <small className="text-muted">
                        {item.part_name} ({item.drawing_number})
                      </small>
                    </div>
                  </div>
                  <FontAwesomeIcon 
                    icon={expandedComponent === item.component_id ? faChevronUp : faChevronDown} 
                    className="text-muted"
                  />
                </ListGroup.Item>
                
                {expandedComponent === item.component_id && (
                  <ListGroup.Item className="bg-light py-2">
                    <div className="small">
                      <strong>Missing Documents:</strong>
                      <div className="mt-2">
                        {item.missing_documents.map((doc, index) => (
                          <Badge 
                            key={index} 
                            bg="light" 
                            text="dark" 
                            className="me-1 mb-1 d-inline-block"
                            style={{ fontSize: '0.8rem' }}
                          >
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                  </ListGroup.Item>
                )}
              </React.Fragment>
            ))}
          </ListGroup>
        )}
      </Popover.Body>
    </Popover>
  );

  return (
    <div className="position-relative">
      <OverlayTrigger
        trigger="click"
        placement="bottom-end"
        overlay={NotificationsPopover}
        rootClose
        show={showNotifications}
        onToggle={setShowNotifications}
      >
        <Button variant="link" className="position-relative p-0 border-0 bg-transparent">
          <FontAwesomeIcon icon={faBell} size="lg" />
          {totalMissing > 0 && (
            <Badge 
              bg="danger" 
              pill 
              className="position-absolute top-0 start-100 translate-middle"
              style={{ fontSize: '0.6rem' }}
            >
              {totalMissing > 9 ? '9+' : totalMissing}
            </Badge>
          )}
        </Button>
      </OverlayTrigger>

      {/* Modal for full details */}
      <Modal show={showAllDetails} onHide={() => setShowAllDetails(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Missing Documents for {showAllDetails?.component_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <strong>Part Name:</strong> {showAllDetails?.part_name}<br />
            <strong>Drawing #:</strong> {showAllDetails?.drawing_number}<br />
            <strong>Customer:</strong> {showAllDetails?.customer}
          </div>
          
          <h5>Missing Documents ({showAllDetails?.missing_count}):</h5>
          <div className="row">
            {showAllDetails?.missing_documents.map((doc, index) => (
              <div key={index} className="col-md-6 mb-2">
                <div className="card h-100">
                  <div className="card-body p-2">
                    <div className="d-flex align-items-center">
                      <span className="text-danger me-2">•</span>
                      <span>{doc}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAllDetails(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MissingDocumentsAlert;