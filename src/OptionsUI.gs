function buildOptionsSection() {
  const section = CardService.newCardSection()
    .setHeader(t('options.title'))
    .setCollapsible(true);

  section.addWidget(
    CardService.newTextInput()
      .setFieldName('prefix')
      .setTitle(t('options.prefix'))
  );

  section.addWidget(
    CardService.newTextInput()
      .setFieldName('suffix')
      .setTitle(t('options.suffix'))
  );

  section.addWidget(
    CardService.newTextInput()
      .setFieldName('search')
      .setTitle(t('options.search'))
  );

  section.addWidget(
    CardService.newTextInput()
      .setFieldName('replace')
      .setTitle(t('options.replace'))
  );

  section.addWidget(
    CardService.newSelectionInput()
      .setFieldName('conflict_resolution')
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setTitle(t('options.conflict'))
      .addItem(t('options.conflict_rename'), 'rename', true)
      .addItem(t('options.conflict_overwrite'), 'overwrite', false)
      .addItem(t('options.conflict_skip'), 'skip', false)
  );

  section.addWidget(
    CardService.newSelectionInput()
      .setFieldName('filter_type')
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setTitle(t('options.filter'))
      .addItem(t('options.filter_all'), 'all', true)
      .addItem(t('options.filter_files'), 'files', false)
      .addItem(t('options.filter_folders'), 'folders', false)
      .addItem(t('options.filter_gdocs'), 'gdocs', false)
  );

  section.addWidget(
    CardService.newSelectionInput()
      .setFieldName('preserve_perms')
      .setType(CardService.SelectionInputType.SWITCH)
      .addItem(t('options.preserve_perms'), 'true', false)
  );

  section.addWidget(
    CardService.newSelectionInput()
      .setFieldName('dry_run')
      .setType(CardService.SelectionInputType.SWITCH)
      .addItem(t('options.dry_run'), 'true', false)
  );

  return section;
}
