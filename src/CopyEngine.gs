function processCopies(items, destFolderId, options) {
  const report = {
    results: [],
    errors: [],
    simulationLogs: []
  };

  items.forEach(item => {
    let targetFolderId = destFolderId;
    if (!targetFolderId) {
      targetFolderId = getParentFolderId(item.id, item.mimeType);
    }

    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    copyOrSimulateItem(item.id, item.mimeType, isFolder, targetFolderId, options, report);
  });

  return report;
}

function copyOrSimulateItem(itemId, mimeType, isFolder, destFolderId, options, report) {
  try {
    if (isFolder) {
      if (options.filter_type === 'files') {
        traverseAndCopy(itemId, destFolderId, options, report);
        return;
      }
    } else {
      if (options.filter_type === 'folders') {
        if (options.dry_run) {
          const info = getItemNameAndMime(itemId, false);
          report.simulationLogs.push(t('simulation.would_skip', { name: info.name }));
        }
        return;
      }
      if (options.filter_type === 'gdocs') {
        const isGDoc = mimeType.indexOf('application/vnd.google-apps.') === 0;
        if (!isGDoc) {
          if (options.dry_run) {
            const info = getItemNameAndMime(itemId, false);
            report.simulationLogs.push(t('simulation.would_skip', { name: info.name }));
          }
          return;
        }
      }
    }

    const itemInfo = getItemNameAndMime(itemId, isFolder);
    const targetName = applyNamingRules(itemInfo.name, isFolder, options.prefix, options.suffix, options.search, options.replace);
    
    const conflictId = checkConflict(targetName, destFolderId, isFolder);
    let finalName = targetName;
    let doCopy = true;

    if (conflictId) {
      if (options.conflict_resolution === 'skip') {
        doCopy = false;
        if (options.dry_run) {
          report.simulationLogs.push(t('simulation.would_skip', { name: targetName }));
        } else {
          report.errors.push(itemInfo.name + ': Omitido');
        }
      } else if (options.conflict_resolution === 'overwrite') {
        if (options.dry_run) {
          report.simulationLogs.push(t('simulation.would_overwrite', { name: targetName }));
        } else {
          deleteItem(conflictId, isFolder);
        }
      } else {
        finalName = getSafeName(targetName, destFolderId, isFolder);
        if (options.dry_run) {
          report.simulationLogs.push(t('simulation.would_rename', { name: finalName }));
        }
      }
    }

    if (doCopy) {
      if (options.dry_run) {
        if (isFolder) {
          report.simulationLogs.push(t('simulation.would_copy_folder', { name: finalName }));
          traverseAndCopy(itemId, destFolderId, options, report);
        } else {
          report.simulationLogs.push(t('simulation.would_copy_file', { name: finalName }));
        }
      } else {
        if (isFolder) {
          const parentFolder = DriveApp.getFolderById(destFolderId);
          const newFolder = parentFolder.createFolder(finalName);
          if (options.preserve_perms) {
            copyPermissions(itemId, newFolder.getId(), true);
          }
          report.results.push('📁 ' + finalName);
          traverseAndCopy(itemId, newFolder.getId(), options, report);
        } else {
          const newFileId = copyFileResource(itemId, destFolderId, finalName);
          if (options.preserve_perms) {
            copyPermissions(itemId, newFileId, false);
          }
          report.results.push('📄 ' + finalName);
        }
      }
    }
  } catch (err) {
    report.errors.push((isFolder ? '📁 ' : '📄 ') + itemId + ': ' + err.message);
  }
}

function traverseAndCopy(sourceFolderId, destFolderId, options, report) {
  const folder = DriveApp.getFolderById(sourceFolderId);
  
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    copyOrSimulateItem(file.getId(), file.getMimeType(), false, destFolderId, options, report);
  }
  
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    const sub = subFolders.next();
    copyOrSimulateItem(sub.getId(), 'application/vnd.google-apps.folder', true, destFolderId, options, report);
  }
}

function applyNamingRules(originalName, isFolder, prefix, suffix, search, replace) {
  let name = originalName;
  let ext = '';
  if (!isFolder) {
    const dotIdx = originalName.lastIndexOf('.');
    if (dotIdx > 0 && dotIdx < originalName.length - 1) {
      name = originalName.substring(0, dotIdx);
      ext = originalName.substring(dotIdx);
    }
  }
  if (search) {
    name = name.split(search).join(replace || '');
  }
  if (prefix) {
    name = prefix + name;
  }
  if (suffix) {
    name = name + suffix;
  }
  return name + ext;
}

function checkConflict(name, parentFolderId, isFolder) {
  const folder = DriveApp.getFolderById(parentFolderId);
  if (isFolder) {
    const iter = folder.getFoldersByName(name);
    return iter.hasNext() ? iter.next().getId() : null;
  } else {
    const iter = folder.getFilesByName(name);
    return iter.hasNext() ? iter.next().getId() : null;
  }
}

function deleteItem(itemId, isFolder) {
  if (isFolder) {
    DriveApp.getFolderById(itemId).setTrashed(true);
  } else {
    DriveApp.getFileById(itemId).setTrashed(true);
  }
}

function copyFileResource(fileId, targetFolderId, name) {
  const resource = {
    name: name,
    parents: [targetFolderId]
  };
  const newFile = Drive.Files.copy(resource, fileId);
  return newFile.id;
}

function copyPermissions(sourceId, destId, isFolder) {
  const source = isFolder ? DriveApp.getFolderById(sourceId) : DriveApp.getFileById(sourceId);
  const dest = isFolder ? DriveApp.getFolderById(destId) : DriveApp.getFileById(destId);
  
  const viewers = source.getViewers();
  viewers.forEach(v => {
    try {
      dest.addViewer(v);
    } catch (e) {}
  });
  
  const editors = source.getEditors();
  editors.forEach(e => {
    try {
      dest.addEditor(e);
    } catch (err) {}
  });
}

function getItemNameAndMime(id, isFolder) {
  if (isFolder) {
    const f = DriveApp.getFolderById(id);
    return { name: f.getName(), mimeType: 'application/vnd.google-apps.folder' };
  } else {
    const f = DriveApp.getFileById(id);
    return { name: f.getName(), mimeType: f.getMimeType() };
  }
}

function getSafeName(originalName, parentFolderId, isFolder) {
  const folder = DriveApp.getFolderById(parentFolderId);
  let name = originalName;
  let ext = '';
  let base = originalName;
  
  if (!isFolder) {
    const dotIdx = originalName.lastIndexOf('.');
    if (dotIdx > 0 && dotIdx < originalName.length - 1) {
      base = originalName.substring(0, dotIdx);
      ext = originalName.substring(dotIdx);
    }
  }
  
  let counter = 0;
  while (nameExistsInFolder(name, folder, isFolder)) {
    counter++;
    name = base + ' - copy' + (counter > 1 ? ' ' + counter : '') + ext;
  }
  return name;
}

function nameExistsInFolder(name, folder, isFolder) {
  if (isFolder) {
    return folder.getFoldersByName(name).hasNext();
  } else {
    return folder.getFilesByName(name).hasNext();
  }
}

const COPY_STATE_KEY = 'copyState';

function getCopyState() {
  const props = PropertiesService.getUserProperties();
  const raw = props.getProperty(COPY_STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveCopyState(state) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(COPY_STATE_KEY, JSON.stringify(state));
}

function clearCopyState() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(COPY_STATE_KEY);
}

function startChunkedCopy(items, destFolderId, options) {
  const state = {
    opt: options,
    destId: destFolderId,
    initItems: items.map(item => ({
      id: item.id,
      mimeType: item.mimeType,
      isFolder: item.mimeType === 'application/vnd.google-apps.folder',
      title: item.title || ''
    })),
    initIndex: 0,
    stack: [],
    cur: null,
    filesDone: false,
    fileToken: null,
    folderToken: null,
    copied: 0,
    errors: 0,
    recent: [],
    recentErrors: [],
    simulationLogs: [],
    status: 'in_progress',
    triggerId: null,
    startTime: Date.now()
  };
  saveCopyState(state);
  return executeCopyChunk(false);
}

function executeCopyChunk(isTrigger) {
  const state = getCopyState();
  if (!state || state.status !== 'in_progress') {
    return state;
  }

  const startTime = Date.now();
  const maxDuration = isTrigger ? 300000 : 18000;

  try {
    while (Date.now() - startTime < maxDuration) {
      if (state.cur) {
        const curFolder = state.cur;
        
        if (!state.filesDone) {
          let filesIterator;
          if (state.fileToken) {
            filesIterator = DriveApp.continueFileIterator(state.fileToken);
            state.fileToken = null;
          } else {
            const folderObj = DriveApp.getFolderById(curFolder.s);
            filesIterator = folderObj.getFiles();
          }

          let fileLoopTimeExceeded = false;
          while (filesIterator.hasNext()) {
            const file = filesIterator.next();
            copyOrSimulateFileOrSubfolder(file.getId(), file.getMimeType(), false, curFolder.t, state.opt, state);
            
            if (Date.now() - startTime >= maxDuration) {
              state.fileToken = filesIterator.getContinuationToken();
              fileLoopTimeExceeded = true;
              break;
            }
          }

          if (fileLoopTimeExceeded) {
            saveCopyState(state);
            return state;
          }

          state.filesDone = true;
        }

        let foldersIterator;
        if (state.folderToken) {
          foldersIterator = DriveApp.continueFolderIterator(state.folderToken);
          state.folderToken = null;
        } else {
          const folderObj = DriveApp.getFolderById(curFolder.s);
          foldersIterator = folderObj.getFolders();
        }

        let folderLoopTimeExceeded = false;
        while (foldersIterator.hasNext()) {
          const sub = foldersIterator.next();
          copyOrSimulateFileOrSubfolder(sub.getId(), 'application/vnd.google-apps.folder', true, curFolder.t, state.opt, state);

          if (Date.now() - startTime >= maxDuration) {
            state.folderToken = foldersIterator.getContinuationToken();
            folderLoopTimeExceeded = true;
            break;
          }
        }

        if (folderLoopTimeExceeded) {
          saveCopyState(state);
          return state;
        }

        state.cur = null;
        state.filesDone = false;
      } else if (state.stack.length > 0) {
        state.cur = state.stack.shift();
      } else if (state.initIndex < state.initItems.length) {
        const item = state.initItems[state.initIndex];
        state.initIndex++;

        let targetFolderId = state.destId;
        if (!targetFolderId) {
          targetFolderId = getParentFolderId(item.id, item.mimeType);
        }

        if (item.isFolder) {
          copyOrSimulateFileOrSubfolder(item.id, item.mimeType, true, targetFolderId, state.opt, state);
        } else {
          copyOrSimulateFileOrSubfolder(item.id, item.mimeType, false, targetFolderId, state.opt, state);
        }
      } else {
        state.status = 'completed';
        break;
      }
    }
  } catch (err) {
    state.status = 'error';
    state.recentErrors.push('Fatal: ' + err.message);
    state.errors++;
  }

  saveCopyState(state);
  return state;
}

function copyOrSimulateFileOrSubfolder(itemId, mimeType, isFolder, destFolderId, options, state) {
  try {
    if (isFolder) {
      if (options.filter_type === 'files') {
        state.stack.push({ s: itemId, t: destFolderId });
        return;
      }
    } else {
      if (options.filter_type === 'folders') {
        if (options.dry_run) {
          const info = getItemNameAndMime(itemId, false);
          addLog(state, t('simulation.would_skip', { name: info.name }), true);
        }
        return;
      }
      if (options.filter_type === 'gdocs') {
        const isGDoc = mimeType.indexOf('application/vnd.google-apps.') === 0;
        if (!isGDoc) {
          if (options.dry_run) {
            const info = getItemNameAndMime(itemId, false);
            addLog(state, t('simulation.would_skip', { name: info.name }), true);
          }
          return;
        }
      }
    }

    const itemInfo = getItemNameAndMime(itemId, isFolder);
    const targetName = applyNamingRules(itemInfo.name, isFolder, options.prefix, options.suffix, options.search, options.replace);
    
    const conflictId = checkConflict(targetName, destFolderId, isFolder);
    let finalName = targetName;
    let doCopy = true;

    if (conflictId) {
      if (options.conflict_resolution === 'skip') {
        doCopy = false;
        if (options.dry_run) {
          addLog(state, t('simulation.would_skip', { name: targetName }), true);
        } else {
          addLog(state, itemInfo.name + ': Omitido', false, true);
        }
      } else if (options.conflict_resolution === 'overwrite') {
        if (options.dry_run) {
          addLog(state, t('simulation.would_overwrite', { name: targetName }), true);
        } else {
          deleteItem(conflictId, isFolder);
        }
      } else {
        finalName = getSafeName(targetName, destFolderId, isFolder);
        if (options.dry_run) {
          addLog(state, t('simulation.would_rename', { name: finalName }), true);
        }
      }
    }

    if (doCopy) {
      if (options.dry_run) {
        if (isFolder) {
          addLog(state, t('simulation.would_copy_folder', { name: finalName }), true);
          state.stack.push({ s: itemId, t: destFolderId });
        } else {
          addLog(state, t('simulation.would_copy_file', { name: finalName }), true);
        }
      } else {
        if (isFolder) {
          const parentFolder = DriveApp.getFolderById(destFolderId);
          const newFolder = parentFolder.createFolder(finalName);
          if (options.preserve_perms) {
            copyPermissions(itemId, newFolder.getId(), true);
          }
          addLog(state, '📁 ' + finalName, false);
          state.stack.push({ s: itemId, t: newFolder.getId() });
        } else {
          const newFileId = copyFileResource(itemId, destFolderId, finalName);
          if (options.preserve_perms) {
            copyPermissions(itemId, newFileId, false);
          }
          addLog(state, '📄 ' + finalName, false);
        }
      }
    }
  } catch (err) {
    addLog(state, (isFolder ? '📁 ' : '📄 ') + itemId + ': ' + err.message, false, true);
  }
}

function addLog(state, message, isSimLog, isError) {
  if (isSimLog) {
    state.simulationLogs.push(message);
    if (state.simulationLogs.length > 50) {
      state.simulationLogs.shift();
    }
  } else if (isError) {
    state.errors++;
    state.recentErrors.push(message);
    if (state.recentErrors.length > 50) {
      state.recentErrors.shift();
    }
  } else {
    state.copied++;
    state.recent.push(message);
    if (state.recent.length > 50) {
      state.recent.shift();
    }
  }
}
