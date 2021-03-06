import React, { Component } from 'react'
import createBrowserHistory from 'history/createBrowserHistory'
import '../assets/LdpApp.css'
import Config from '../Config'
import Client from '../utils/Client'
import Header from './Header'
import NavigationForm from './NavigationForm'
import LdpType from './LdpType'
import Resource from './Resource'
import Versions from './Versions'
import Audit from './Audit'
import Containment from './Containment'
import Membership from './Membership'
import NonRDFSource from './NonRDFSource'
import Alerts from './Alerts'
import Modal from './Modal'
import Editor from './Editor'
import { LDP } from '../utils/Vocab'

class App extends Component {

  constructor(props, context) {
    super(props, context);

    // Define state
    this.state = {
      identifier: '',
      err: '',
      types: [],
      mementos: [],
      contentType: '',
      children: [],
      members: [],
      audit: [],
      resource: '',
      content: ''
    }

    // Function bindings
    this.resourceClick = this.resourceClick.bind(this);
    this.modifyClick = this.modifyClick.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);

    // Set up history
    this.history = createBrowserHistory();
    this.history.push('/', { id: '' });
    this.history.listen(this.handleNavigation);
  }

  /**
   * Load the data for the selected resource.
   */
  loadResource = (values = {}) => {
    const url = Config.BASE_URL + (values.identifier || '');
    const client = new Client(url);
    client.fetchHead().then(headers => {
      const state = {
        identifier: values.identifier,
        err: headers.err,
        types: headers.types,
        mementos: headers.mementos,
        contentType: headers.contentType,
        children: [],
        members: [],
        audit: [],
        resource: '',
        content: ''
      };
      if (headers.err) {
        this.setState(() => state);
      } else {
        Promise.all([
          client.fetchResource(headers.description),
          client.fetchAudit(headers.description),
          client.fetchMembership(headers.description),
          client.fetchContainment(headers.description),
          this.shouldGetRemote(headers) ? client.fetchContent() : ''])
          .then(([resource, audit, membership, containment, content]) => {
             state.resource = resource;
             state.audit = audit;
             state.children = containment;
             state.members = membership;
             state.content = content;
             this.setState(() => state)
           });
      }
    });
  }

  /**
   * Determine if the remote content should be fetched directly.
   */
  shouldGetRemote({types = [], contentType = ''}) {
    return types.includes(LDP.NonRDFSource)
      && Client.parseContentType(contentType).type === "text"
  }

  /**
   * Handle any browser navigation actions.
   */
  handleNavigation(loc = {}, action) {
    this.loadResource({identifier: (loc.state || {}).id});
  }

  /**
   * Handle click events on resource IRIs.
   */
  resourceClick(e, override) {
    let id = override
    if (!id && e && e.target) {
      id = e.target.textContent
    }
    this.history.push('/', { id: id || '' });
  }

  modifyClick(method) {
    const modal = document.getElementById('modal-root');
    modal.style.display = 'block';
    this.setState(() => ({
      action: method
    }));
    window.onclick = (evt) => {
      if (evt.target.classList.contains('modal')) {
        modal.style.display = "none";
      }
    }
  }

  /**
   * Handle a submit event.
   */
  handleSubmit(identifier = '') {
    this.history.push('/', {id: identifier });
  }

  /**
   * Handle an edit event.
   */
  handleEdit(id = '') {
    this.loadResource({identifier: id});
  }

  /**
   * React initialization: load the root resource.
   */
  componentDidMount() {
    this.loadResource();
  }

  /**
   * React render.
   */
  render() {
    return (
      <div className="LdpApp">
        <Header identifier={this.state.identifier}/>
        <NavigationForm onSubmit={this.handleSubmit}/>
        <Alerts alert={this.state.err}/>
        <div className="meta">
          <LdpType types={this.state.types}/>
          <Versions versions={this.state.mementos} identifier={this.state.identifier} onClick={this.resourceClick}/>
          <Audit data={this.state.audit}/>
          <Containment children={this.state.children} onClick={this.resourceClick}/>
        </div>
        <article>
          <Resource data={this.state.resource} types={this.state.types} onClick={this.modifyClick}/>
          <NonRDFSource identifier={this.state.identifier} content={this.state.content} contentType={this.state.contentType}/>
          <Membership members={this.state.members} onClick={this.resourceClick}/>
        </article>
        <Modal>
          <Editor identifier={this.state.identifier} action={this.state.action} types={this.state.types} onSubmit={this.handleEdit}/>
        </Modal>
      </div>
    );
  }
}

export default App
